import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';

// The story of each stretch of the journey is not told when a challenge is won (that is only a short cheer) but on
// arriving at the house of whoever helps with the next one: the narrator tells it in the text box while the player
// looks at the place and, as it ends, that character comes out of the house and walks to where they are spoken to.
// Each story is told once per run of the story (progress.historiasContadas).

type Llegada = {
  // Id of the story (kept in progress.historiasContadas) and the dialog that tells it.
  id: string;
  dialog: string;
  // Where it is told: within `radius` of this point (world, y up), about that high.
  center: readonly [number, number, number];
  radius: number;
  // Whether it is still to be told, by the story so far (the character is there, nobody spoke to them yet).
  pending: (progress: GameProgress) => boolean;
};

interface LlegadaState {
  // The story being told and the moment (performance.now()) it began.
  id: string | null;
  desde: number;
  contar: (id: string) => void;
  terminar: () => void;
}

export const useLlegadaStore = create<LlegadaState>((set) => ({
  id: null,
  desde: 0,
  contar: (id) => set({ id, desde: performance.now() }),
  terminar: () => set({ id: null }),
}));

const CHECK_MS = 300;
// Feet this far above or below the place are on another level (the tunnels run under the summit).
const SAME_LEVEL = 6;

// Tells the story when the player gets there: opens its dialog and records it as told (a reload in the middle does
// not tell it again). Meant for the dialog component itself, which is always mounted.
export function useLlegada({ id, dialog, center, radius, pending }: Llegada) {
  useEffect(() => {
    const interval = setInterval(() => {
      const world = useWorldStore.getState();
      const ui = useUIStore.getState();
      if (!world.ready || world.warming || ui.dialog !== null || ui.cinematic || ui.backpackOpen) return;
      const { progress } = useProgressStore.getState();
      if (progress.historiasContadas.includes(id) || !pending(progress)) return;
      const player = usePlayerStore.getState();
      if (player.health <= 0 || player.guide !== null) return;
      const { x, y, z } = player.position;
      if (Math.abs(y - center[1]) > SAME_LEVEL || Math.hypot(x - center[0], z - center[2]) > radius) return;
      saveProgress({ historiasContadas: [...progress.historiasContadas, id] });
      useLlegadaStore.getState().contar(id);
      ui.openDialog(dialog);
    }, CHECK_MS);
    return () => clearInterval(interval);
    // The place and the rule of a story never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dialog]);
}

// The story ended: its dialog closes and the player moves again.
export function terminarLlegada(id: string) {
  if (useLlegadaStore.getState().id === id) useLlegadaStore.getState().terminar();
  useUIStore.getState().closeDialog();
}

// Whether the character of story `id` should set off now: `antes` seconds before the story, `dura` seconds long,
// ends. It stays true once reached.
export function useSalida(id: string, dura: number, antes: number): boolean {
  const desde = useLlegadaStore((state) => (state.id === id ? state.desde : null));
  const [salio, setSalio] = useState(false);
  useEffect(() => {
    if (desde === null) return;
    const wait = Math.max(0, desde + (dura - antes) * 1000 - performance.now());
    const timer = setTimeout(() => setSalio(true), wait);
    return () => clearTimeout(timer);
  }, [desde, dura, antes]);
  return salio;
}

// Whether story `id` is being told right now.
export const useContando = (id: string) => useLlegadaStore((state) => state.id === id);
