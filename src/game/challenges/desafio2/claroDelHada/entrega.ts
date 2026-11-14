import { MathUtils, Vector3 } from 'three';
import { findCharacter } from '@/data/characters';
import { AMULETO_HADA, withExtraStar } from '@/game/challenges/bonos';
import { playSfx, playVoice } from '@/game/engine/audio/audio';
import { usePlayerStore, type ScenePose } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { useClaroStore, type Entrega } from './claroStore';
import { amuletoVivo, hadaEscena, hadaViva, manosDelHada } from './hadaViva';
import { ATRIL, ENTREGA_PIE } from './lugares';

// Bonus 2, last step: the fairy gives her amulet. The avatar kneels in front of the root lectern, she brings the
// amulet flying slowly (it is heavy for her), hangs it on the avatar's neck and celebrates; the avatar stands with it
// on its chest. The bonus, its extra star and the amulet are saved at the end.

// From the lectern toward the avatar's place (unit, flat).
const HACIA_AVATAR = new Vector3(ENTREGA_PIE.x - ATRIL[0], 0, ENTREGA_PIE.z - ATRIL[2]).normalize();
// The avatar comes to its place from a little farther out, so that it is left facing the lectern.
const LLEGADA = { x: ENTREGA_PIE.x + HACIA_AVATAR.x * 0.6, z: ENTREGA_PIE.z + HACIA_AVATAR.z * 0.6 };
// She hovers this far in front of the kneeling avatar, her hands (0.5 m above her feet) at the height of its neck
// (this much of its height, on one knee); never lower than MIN above the ground.
const FRENTE = 0.5;
const CUELLO = 0.6;
const MIN = 0.08;
// The amulet on the chest: this far in front of the spine and this much of its size.
const PECHO = { frente: 0.13, escala: 0.6 };

const CAMINO_MAX_MS = 7000;
const CAMINO_CERCA = 0.3;
const ARRODILLA_MS = 1000;
const ACERCA_MS = 1900;
const CUELGA_MS = 1500;
const CELEBRA_MS = 5200;
const DE_PIE_MS = 700;
const GUARDA_MS = 900;

// Live values: where the amulet hangs on the avatar's chest (the scene writes it every frame from the avatar's
// skeleton; null until it has found it).
export const entregaViva = { pecho: null as Vector3 | null };

const pose: ScenePose = { clip: 'Arrodillarse', feet: new Vector3(), yaw: Math.atan2(-HACIA_AVATAR.x, -HACIA_AVATAR.z), sway: new Vector3(), elbow: new Vector3(), hand: new Vector3(), reach: 0, touch: true };
const desde = new Vector3();
const frente = new Vector3();
const manos = new Vector3();
const pecho = new Vector3();
let camino: { x: number; z: number }[] = [];
let voz: (() => void) | null = null;

const setEntrega = (entrega: Entrega | null) => useClaroStore.getState().setEntrega(entrega);
const altura = () => findCharacter(useAuthStore.getState().user?.avatarName).height;

function seguirCamino() {
  const player = usePlayerStore.getState();
  const next = camino[0];
  player.setGuide({ walkTo: next ? { x: next.x, y: player.position.y, z: next.z } : null });
}

// E by the lectern once the fairy waits there with her amulet: the avatar goes to kneel in front of it.
export function empezarEntrega() {
  const player = usePlayerStore.getState();
  const { progress } = useProgressStore.getState();
  if (useClaroStore.getState().entrega || !progress.hadaLiberada || progress.bono2Completado || !hadaViva.conAmuleto || player.health <= 0) return;
  useUIStore.getState().setBackpackOpen(false);
  entregaViva.pecho = null;
  hadaEscena.activa = true;
  hadaEscena.clip = 'Entregar';
  hadaEscena.position.copy(hadaViva.position);
  hadaEscena.luz = 1.2;
  hadaEscena.giro = 0;
  hadaEscena.mira.set(ENTREGA_PIE.x, 0, ENTREGA_PIE.z);
  camino = [LLEGADA, ENTREGA_PIE];
  seguirCamino();
  setEntrega({ fase: 'camino', desde: performance.now() });
}

// Where the amulet rests on the chest: by the skeleton if the scene found it, by the avatar's height otherwise.
function enElPecho() {
  if (entregaViva.pecho) return pecho.copy(entregaViva.pecho).addScaledVector(HACIA_AVATAR, -PECHO.frente * altura());
  const player = usePlayerStore.getState();
  return pecho.set(player.position.x, player.position.y + 0.72 * altura(), player.position.z).addScaledVector(HACIA_AVATAR, -PECHO.frente * altura());
}

// Ends it, whatever its step: the fairy, the avatar and the camera go back to the game. Nothing is saved here.
export function terminarEntrega() {
  if (!useClaroStore.getState().entrega) return;
  camino = [];
  hadaEscena.activa = false;
  hadaEscena.luz = 1;
  hadaEscena.giro = 0;
  amuletoVivo.escala = 1;
  setEntrega(null);
  const player = usePlayerStore.getState();
  player.setGuide(null);
  player.setPose(null);
}

// One frame further (called by the scene).
export function avanzarEntrega(now: number, delta: number) {
  const { entrega } = useClaroStore.getState();
  if (!entrega) return;
  const player = usePlayerStore.getState();
  if (player.health <= 0 || useUIStore.getState().dialog !== null) {
    voz?.();
    return terminarEntrega();
  }
  const elapsed = now - entrega.desde;
  const hada = hadaEscena.position;

  if (entrega.fase === 'camino') {
    const next = camino[0];
    if (next && elapsed < CAMINO_MAX_MS) {
      if (Math.hypot(player.position.x - next.x, player.position.z - next.z) > CAMINO_CERCA) return;
      camino.shift();
      seguirCamino();
      if (camino.length) return;
    }
    camino = [];
    pose.feet.set(ENTREGA_PIE.x, player.position.y, ENTREGA_PIE.z);
    player.setGuide({ walkTo: null });
    player.setPose(pose);
    return setEntrega({ fase: 'arrodilla', desde: now });
  }

  if (entrega.fase === 'arrodilla') {
    if (elapsed < ARRODILLA_MS) return;
    desde.copy(hada);
    frente.copy(pose.feet).addScaledVector(HACIA_AVATAR, -FRENTE);
    frente.y = pose.feet.y + Math.max(MIN, CUELLO * altura() - 0.5);
    return setEntrega({ fase: 'acerca', desde: now });
  }

  if (entrega.fase === 'acerca') {
    // Slowly, sagging a little on the way: the amulet is heavy for her.
    const t = Math.min(1, elapsed / ACERCA_MS);
    hada.lerpVectors(desde, frente, MathUtils.smoothstep(t, 0, 1));
    hada.y += 0.07 * Math.sin(elapsed / 170) - 0.12 * Math.sin(Math.PI * t);
    hadaEscena.mira.copy(pose.feet);
    if (t >= 1) setEntrega({ fase: 'cuelga', desde: now });
    return;
  }

  if (entrega.fase === 'cuelga') {
    // From her hands to the avatar's chest, in a small arc over its head.
    const t = MathUtils.smoothstep(Math.min(1, elapsed / CUELGA_MS), 0, 1);
    hada.copy(frente);
    hada.y += 0.04 * Math.sin(elapsed / 170);
    amuletoVivo.position.lerpVectors(manosDelHada(manos), enElPecho(), t);
    amuletoVivo.position.y += 0.12 * altura() * Math.sin(Math.PI * t);
    amuletoVivo.escala = MathUtils.lerp(1, PECHO.escala, t);
    if (elapsed < CUELGA_MS) return;
    playSfx('d2_amuleto');
    voz = playVoice(['02_hada_02']);
    hadaEscena.clip = 'Celebrar';
    return setEntrega({ fase: 'celebra', desde: now });
  }

  if (entrega.fase === 'celebra') {
    // The avatar stands with the amulet on its chest; she backs off, up, and spins for joy.
    if (elapsed > DE_PIE_MS && player.pose) {
      player.setPose(null);
      player.setGuide({ walkTo: null });
    }
    const t = MathUtils.smoothstep(Math.min(1, elapsed / 900), 0, 1);
    hada.copy(frente).addScaledVector(HACIA_AVATAR, -0.7 * t);
    hada.y += 0.75 * t + 0.08 * Math.sin(elapsed / 200);
    hadaEscena.giro += delta * 5.5 * (1 - Math.min(1, elapsed / 2600));
    hadaEscena.luz = 1.8;
    hadaEscena.mira.copy(player.position);
    amuletoVivo.position.copy(enElPecho());
    amuletoVivo.escala = PECHO.escala * (1 + 0.12 * Math.sin(elapsed / 180) * Math.max(0, 1 - elapsed / 1500));
    if (elapsed >= CELEBRA_MS) setEntrega({ fase: 'guarda', desde: now });
    return;
  }

  // The amulet goes into the backpack; then the bonus is saved and told.
  amuletoVivo.position.copy(enElPecho());
  amuletoVivo.escala = PECHO.escala * Math.max(0, 1 - elapsed / GUARDA_MS);
  if (elapsed < GUARDA_MS) return;
  terminarEntrega();
  const { progress } = useProgressStore.getState();
  saveProgress({ collectedItems: [...progress.collectedItems, AMULETO_HADA], bono2Completado: true, vidasExtra: withExtraStar(progress) });
  useUIStore.getState().openDialog(DIALOG.hadaAmuleto);
}
