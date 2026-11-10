import { useEffect, useState } from 'react';
import { loopSfx, playSfx, playVoice, preloadSfx, setAmbience, setMusic, stopVoice, type Loop } from '@/game/engine/audio/audio';
import type { SfxId } from '@/game/engine/audio/catalog';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useMundoRecuperado } from '@/game/world/recuperado';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { ambienceFor, classifySpot, musicFor, type Spot } from './soundscape';
import { voicesForToast } from './voices';

// Effects that must answer at once: decoded while the world loads.
const PRELOAD: readonly SfxId[] = [
  'jug_pasos_nieve', 'jug_pasos_tierra', 'jug_pasos_lodo', 'jug_pasos_madera', 'jug_pasos_piedra', 'jug_pasos_hojas',
  'jug_salto', 'jug_aterrizaje', 'jug_dano', 'ui_dialogo_abrir', 'ui_dialogo_cerrar', 'ui_boton', 'ui_recoger',
  'ui_mochila_abrir', 'ui_mochila_cerrar', 'ui_aviso',
];

const LOW_HEALTH = 25;
// A blow sounds; the slow drain of hunger (a little every frame) only now and then.
const BLOW = 2;
const DRAIN_SOUND_SECONDS = 2.5;

// Sting that announces what a dialog brings, by its id (see each challenge's dialogs.ts and progression.ts).
function stingFor(dialog: string): SfxId {
  if (dialog.startsWith('bajo.')) return 'ui_estrella_perdida';
  if (dialog.endsWith('cartaAlcalde')) return 'obj_carta';
  return 'ui_dialogo_abrir';
}

// Music and ambience of where the player is (see soundscape.ts). While the world loads, the main theme plays.
function Soundscape() {
  const region = useZoneStore((state) => state.region);
  const interior = useZoneStore((state) => state.interior);
  const cinematic = useUIStore((state) => state.cinematic);
  const ready = useWorldStore((state) => state.ready);
  const recovered = useMundoRecuperado();
  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const { x, y, z } = usePlayerStore.getState().position;
      setSpot(classifySpot(x, y, z));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ready) {
      setMusic('mus_menu');
      setAmbience(null);
      return;
    }
    const place = { region, interior, spot, cinematic, recovered };
    setMusic(musicFor(place));
    setAmbience(ambienceFor(place));
  }, [ready, region, interior, spot, cinematic, recovered]);

  // Leaving the world (profile, admin, sign out) silences it.
  useEffect(
    () => () => {
      setMusic(null);
      setAmbience(null);
      stopVoice();
    },
    [],
  );
  return null;
}

// The sounds that follow what happens in the stores: dialogs and backpack, damage and healing, notices and their
// narrated voices, pickups, bonuses and challenges completed. Each challenge adds the sounds of its own events.
function StoreSounds() {
  useEffect(() => {
    preloadSfx(PRELOAD);
    let heartbeat: Loop | null = null;
    let lastDrain = -Infinity;
    const worldReady = () => useWorldStore.getState().ready;

    const offUI = useUIStore.subscribe((state, previous) => {
      if (state.dialog !== previous.dialog) {
        if (state.dialog) playSfx(stingFor(state.dialog), { volume: 0.8 });
        else playSfx('ui_dialogo_cerrar', { volume: 0.6 });
      }
      if (state.backpackOpen !== previous.backpackOpen) playSfx(state.backpackOpen ? 'ui_mochila_abrir' : 'ui_mochila_cerrar', { volume: 0.8 });
      if (state.cinematic && !previous.cinematic) playSfx('rc_caliz');
    });

    const offPlayer = usePlayerStore.subscribe((state, previous) => {
      if (state.health === previous.health) return;
      if (state.health < previous.health) {
        const now = performance.now() / 1000;
        if (state.health <= 0) playSfx('jug_derrota');
        else if (previous.health - state.health >= BLOW) playSfx('jug_dano');
        else if (now - lastDrain > DRAIN_SOUND_SECONDS) {
          lastDrain = now;
          playSfx('jug_dano', { volume: 0.45 });
        }
      }
      // Coming back after a defeat is not a healing.
      else if (previous.health > 0) playSfx('jug_curacion', { volume: 0.6 });
      const low = state.health > 0 && state.health < LOW_HEALTH;
      if (low && !heartbeat) heartbeat = loopSfx('jug_vida_baja', 0.7);
      else if (!low && heartbeat) {
        heartbeat.stop(0.6);
        heartbeat = null;
      }
    });

    const offToast = useToastStore.subscribe((state, previous) => {
      if (state.id === previous.id || !state.message) return;
      playSfx('ui_aviso', { volume: 0.5 });
      const clips = voicesForToast(state.message);
      // A dialog that opened at the same time has the word.
      if (clips && !useUIStore.getState().dialog) playVoice(clips);
    });

    const offProgress = useProgressStore.subscribe(({ progress }, { progress: before }) => {
      // Loading the saved game or starting over is not an achievement.
      if (!worldReady() || progress === before) return;
      if (progress.collectedItems.length > before.collectedItems.length) playSfx('ui_recoger');
      if ((progress.bono1Completado && !before.bono1Completado) || (progress.bono2Completado && !before.bono2Completado)) {
        playSfx('ui_bono');
      }
      const completed =
        (progress.mision1Completada && !before.mision1Completada) ||
        (progress.mision2Completada && !before.mision2Completada) ||
        (progress.mision3Completada && !before.mision3Completada);
      if (completed) playSfx('ui_desafio_superado');
    });

    const offWorld = useWorldStore.subscribe((state, previous) => {
      if (state.ready && !previous.ready) playSfx('ui_carga_lista', { volume: 0.6 });
    });

    return () => {
      offUI();
      offPlayer();
      offToast();
      offProgress();
      offWorld();
      heartbeat?.stop();
    };
  }, []);
  return null;
}

// Everything the world sounds like that does not belong to one challenge. Drawn by the game page, outside the canvas.
export function GameSound() {
  return (
    <>
      <Soundscape />
      <StoreSounds />
    </>
  );
}
