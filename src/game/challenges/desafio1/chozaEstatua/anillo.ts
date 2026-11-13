import { MathUtils, Vector3 } from 'three';
import { findCharacter } from '@/data/characters';
import { ANILLO_ORO, withExtraStar } from '@/game/challenges/bonos';
import { playSfx } from '@/game/engine/audio/audio';
import type { GestureItem } from '@/game/player/gestureTable';
import { usePlayerStore, type ScenePose } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { enElMundo, FRENTE, LADO, LOSA_Y, useChozaStore, type Anillo } from './limpieza';

// Bonus 1, last step: the avatar walks up to the statue, reaches with both hands for the gold ring it holds out, takes
// it with the right one and lifts it to look at it by the light of the fire. Only then is the ring the player's (the
// bonus is saved, with its extra star). Nothing to play here: it is the reward.

// The ring in the statue's open hands, seen from its face as [in front, to the avatar's left] (m), and its height.
const ANILLO_EN = [0.325, 0.014] as const;
const ANILLO_Y = 10.27;
// The avatar comes from the statue's side, never from the front (the fire burns there): along this direction from the
// ring, this far from it by its height. Tall characters reach from the floor; short ones step on the slab (anyone under
// BAJO metres). It leans in by INCLINA per metre of height.
const DESDE = new Vector3().addScaledVector(FRENTE, 0.62).addScaledVector(LADO, 0.78).normalize();
const LEJOS = { base: 0.2, porAltura: 0.18 };
const BAJO = 1.5;
const INCLINA = 0.13;
// The way there, around the fire: [in front of the face, to the avatar's left].
const RODEO = [
  [2.1, 1.25],
  [1.0, 0.85],
] as const;
// Reaching for the ring, lifting it and looking at it take this long (ms).
const ALCANZA_MS = 1100;
const ALZA_MS = 1300;
const MIRA_MS = 1500;
const CAMINO_MAX_MS = 6000;
const CAMINO_CERCA = 0.3;
// Lifted, the ring is held this far in front of the avatar and this high (per metre of height): before its eyes.
const ALZADO = { frente: 0.2, alto: 0.84 };

// The ring between the fingers of the right hand (a copy of the statue's ring, for the hand).
const ANILLO_URL = '/models-3d/objects/AnilloOro.glb';
const AGARRE: GestureItem = { hand: 'right', size: 0.06, byEnd: false, along: 'blade', flip: false, turn: 0, handle: 0.08, offset: [0, 0.07, 0.02], held: [0, 99] };

const ring = (() => {
  const at = enElMundo(ANILLO_EN);
  return new Vector3(at.x, ANILLO_Y, at.z);
})();
const pose: ScenePose = {
  clip: 'Idle',
  feet: new Vector3(),
  yaw: Math.atan2(-DESDE.x, -DESDE.z),
  sway: new Vector3(),
  elbow: new Vector3(),
  hand: new Vector3(),
  reach: 0,
  touch: true,
  left: new Vector3(),
  palm: new Vector3(0, -1, 0),
  fingers: DESDE.clone().negate(),
};
const alzado = new Vector3();
const bajoLaMano = new Vector3();
let camino: { x: number; z: number }[] = [];
let inclinado = 0;

const setAnillo = (anillo: Anillo | null) => useChozaStore.getState().setAnillo(anillo);
const ease = (t: number) => MathUtils.smoothstep(t, 0, 1);

function seguirCamino() {
  const player = usePlayerStore.getState();
  const next = camino[0];
  player.setGuide({ walkTo: next ? { x: next.x, y: player.position.y, z: next.z } : null });
}

// E by the statue once the fire is lit (or the button of its dialog): the avatar goes for the ring.
export function empezarAnillo() {
  const player = usePlayerStore.getState();
  const { progress } = useProgressStore.getState();
  const choza = useChozaStore.getState();
  if (choza.anillo || choza.encendido || choza.limpieza || !progress.estatuaEncendida || progress.bono1Completado || player.health <= 0) return;
  useUIStore.getState().setBackpackOpen(false);
  // Around the fire: whoever is in front of it, or on its other side, first goes out to the left of the plate.
  const at = enElMundo([0, 0]);
  const dx = player.position.x - at.x;
  const dz = player.position.z - at.z;
  const frente = dx * FRENTE.x + dz * FRENTE.z;
  const lado = dx * LADO.x + dz * LADO.z;
  camino = [...(frente > 1.2 && lado < 0.9 ? [enElMundo(RODEO[0])] : []), enElMundo(RODEO[1])];
  seguirCamino();
  setAnillo({ fase: 'camino', desde: performance.now() });
}

// The avatar takes its place by the statue's hands and starts reaching for the ring.
function acercar() {
  const player = usePlayerStore.getState();
  const height = findCharacter(useAuthStore.getState().user?.avatarName).height;
  const lejos = LEJOS.base + LEJOS.porAltura * height;
  pose.feet.copy(ring).addScaledVector(DESDE, lejos);
  pose.feet.y = height < BAJO ? LOSA_Y : player.position.y;
  inclinado = INCLINA * height;
  pose.sway.copy(DESDE).multiplyScalar(-inclinado);
  // The right hand comes down on the ring from above; the left one cups under the statue's hands.
  pose.hand.copy(ring).addScaledVector(DESDE, 0.06);
  pose.hand.y += 0.07;
  bajoLaMano.copy(ring).addScaledVector(DESDE, 0.1).addScaledVector(FRENTE, 0.1);
  bajoLaMano.y -= 0.02;
  pose.left!.copy(bajoLaMano);
  pose.palm!.set(0, -1, 0);
  pose.fingers!.copy(DESDE).negate();
  alzado.copy(pose.feet).addScaledVector(DESDE, -ALZADO.frente * height);
  alzado.y += ALZADO.alto * height;
  pose.reach = 0;
  player.setGuide({ walkTo: null });
  player.setPose(pose);
}

// Ends it, whatever its step: the avatar and the camera go back to the player.
export function terminarAnillo() {
  if (!useChozaStore.getState().anillo) return;
  camino = [];
  setAnillo(null);
  const player = usePlayerStore.getState();
  player.setGuide(null);
  player.setPose(null);
  player.setWear(null);
}

// Taking the ring, one frame further (called by the scene).
export function avanzarAnillo(now: number) {
  const { anillo } = useChozaStore.getState();
  if (!anillo) return;
  const player = usePlayerStore.getState();
  if (player.health <= 0 || useUIStore.getState().dialog !== null) return terminarAnillo();
  const elapsed = now - anillo.desde;

  if (anillo.fase === 'camino') {
    const next = camino[0];
    if (next && elapsed < CAMINO_MAX_MS) {
      if (Math.hypot(player.position.x - next.x, player.position.z - next.z) > CAMINO_CERCA) return;
      camino.shift();
      seguirCamino();
      if (camino.length) return;
    }
    camino = [];
    acercar();
    return setAnillo({ fase: 'alcanza', desde: now });
  }

  if (anillo.fase === 'alcanza') {
    pose.reach = ease(elapsed / ALCANZA_MS);
    if (elapsed < ALCANZA_MS) return;
    // The fingers close on the ring: it leaves the statue's hands.
    playSfx('d1_anillo');
    player.setWear({ url: ANILLO_URL, gesture: 'UseCompass', grip: AGARRE });
    return setAnillo({ fase: 'alza', desde: now });
  }

  if (anillo.fase === 'alza') {
    // The hand rises with the ring and turns its palm to the avatar; the body straightens; the left hand lets go.
    const k = ease(elapsed / ALZA_MS);
    pose.hand.copy(ring).addScaledVector(DESDE, 0.06);
    pose.hand.y += 0.07;
    pose.hand.lerp(alzado, k);
    pose.palm!.set(0, -1, 0).lerp(DESDE, k).normalize();
    pose.fingers!.copy(DESDE).negate().lerp(Vector3Up, k).normalize();
    pose.sway.copy(DESDE).multiplyScalar(-inclinado * (1 - k));
    pose.left!.copy(bajoLaMano).lerp(alzado, k * 0.35);
    pose.left!.y -= 0.25 * k;
    if (elapsed >= ALZA_MS) setAnillo({ fase: 'mira', desde: now });
    return;
  }

  // It looks at the ring, turning it a little by the light of the fire; then it is the player's.
  const turn = Math.sin((elapsed / MIRA_MS) * Math.PI * 2) * 0.35;
  pose.palm!.copy(DESDE).addScaledVector(LADO, turn * 0.6).addScaledVector(FRENTE, -turn * 0.6).normalize();
  if (elapsed < MIRA_MS) return;
  terminarAnillo();
  const { progress } = useProgressStore.getState();
  saveProgress({ collectedItems: [...new Set([...progress.collectedItems, ANILLO_ORO])], bono1Completado: true, vidasExtra: withExtraStar(progress) });
  useUIStore.getState().openDialog(DIALOG.estatua);
}

const Vector3Up = new Vector3(0, 1, 0);

// Where the ring and the avatar's hands are (for the camera).
export const ANILLO_MIRA = ring;
