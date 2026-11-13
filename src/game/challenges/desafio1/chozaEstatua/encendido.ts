import { Vector3 } from 'three';
import { findCharacter } from '@/data/characters';
import { playSfx } from '@/game/engine/audio/audio';
import type { GestureItem } from '@/game/player/gestureTable';
import { usePlayerStore, type ScenePose } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { enElMundo, FRENTE, LADO, useChozaStore, type Encendido } from './limpieza';

// Bonus 1, second step: the avatar kneels by the stone plate at the statue's feet and strikes two small fire stones
// together (a dark flint and a golden pyrite: "Pedernal.blend" of the objects folder) until the tinder catches. Every click is a strike that throws sparks and feeds the ember, which
// cools by itself: a handful of strikes in a row light it. Then the flames rise around the statue, burn the moss left
// on its body and settle into a fire that stays lit.

// The stone plate, seen from the statue's face as [in front, to the avatar's left] (m), and the top of its rim.
const PLATO_EN = [1.36, 0.03] as const;
export const PLATO = { ...enElMundo(PLATO_EN), y: 9.43 };
// How far from its middle the player can stand (its cuboid plus the capsule's radius).
const PLATO_BORDE = 0.72;
// The avatar kneels to the left of the plate (never between it and the statue), facing it, this far from its middle
// per metre of height; it leans in by INCLINA and holds its hands over the plate, this far ahead of its feet and this
// high (all per metre of height).
const YAW = Math.atan2(-LADO.x, -LADO.z);
const LEJOS = 0.4;
const INCLINA = 0.12;
const MANOS = { frente: 0.38, alto: 0.3 };
// The pyrite (right hand) waits this much above the flint (left hand) and comes down on it in GOLPE_MS.
const ALZADO = 0.11;
const GOLPE_MS = 170;
// The ember, from 0 to 1: what a strike adds and what it loses per second.
const BRASA = { golpe: 0.2, enfria: 0.1 };
// Kneeling down takes as long as its clip; the flames take LLAMAS_MS to rise and settle, and the avatar gets up and
// steps back RETIRO_MS into them.
const AGACHA_MS = 1000;
const LLAMAS_MS = 4300;
const RETIRO_MS = 450;
const CAMINO_MAX_MS = 6000;
const CAMINO_CERCA = 0.3;
// Where the avatar steps back to, away from the fire, and the short step it then takes toward it, so that it is left
// facing the fire and the statue (it turns to where it walks).
const RETIRO = enElMundo([1.95, 1.95]);
const DE_FRENTE = enElMundo([1.72, 1.55]);
const DE_FRENTE_CERCA = 0.12;

export const PEDERNAL_URL = '/models-3d/objects/Pedernal.glb';
export const PIRITA_URL = '/models-3d/objects/Pirita.glb';
const PIRITA: GestureItem = { hand: 'right', size: 0.085, byEnd: false, along: 'blade', flip: false, turn: 0, handle: 0.08, offset: [0, 0, 0.012], held: [0, 99] };
const PEDERNAL: GestureItem = { hand: 'left', size: 0.1, byEnd: false, along: 'blade', flip: false, turn: 0, handle: 0.08, offset: [0, 0, 0.012], held: [0, 99] };

// Live values, mutated in place and read every frame by the scene and the HUD: the ember (0..1), when the steel last
// struck (ms; sparks fly then) and how far the flames are (0 none, 1 settled; they peak in between).
export const encendidoVivo = { brasa: 0, golpeAt: -Infinity, llamas: 0 };
const pose: ScenePose = { clip: 'Arrodillarse', feet: new Vector3(), yaw: YAW, sway: new Vector3(), elbow: new Vector3(), hand: new Vector3(), reach: 0, touch: true, left: new Vector3() };
const manos = new Vector3();
let camino: { x: number; z: number }[] = [];
// 0 still kneeling, 1 walking away from the fire, 2 turning back to it, 3 standing.
let retirado = 0;

// Where the sparks fly from (between the two hands).
export const chispasDesde = () => manos;

const setEncendido = (encendido: Encendido | null) => useChozaStore.getState().setEncendido(encendido);

function seguirCamino() {
  const player = usePlayerStore.getState();
  const next = camino[0];
  player.setGuide({ walkTo: next ? { x: next.x, y: player.position.y, z: next.z } : null });
}

// E by the statue once its face is clean (or the button of its dialog): the avatar goes to kneel by the plate.
export function empezarEncendido() {
  const player = usePlayerStore.getState();
  const { progress } = useProgressStore.getState();
  const choza = useChozaStore.getState();
  if (choza.encendido || choza.limpieza || !progress.estatuaLimpia || progress.estatuaEncendida || player.health <= 0) return;
  encendidoVivo.brasa = 0;
  encendidoVivo.llamas = 0;
  encendidoVivo.golpeAt = -Infinity;
  retirado = 0;
  useUIStore.getState().setBackpackOpen(false);
  const height = findCharacter(useAuthStore.getState().user?.avatarName).height;
  // The plate is solid (its cuboid): the avatar walks to just outside it and is then drawn kneeling at its edge.
  const sitio = enElMundo([PLATO_EN[0], PLATO_EN[1] + Math.max(LEJOS * height, PLATO_BORDE)]);
  // Coming from the plate's other side, the avatar goes around it (in front of it or by the slab) and never over it.
  const dx = player.position.x - PLATO.x;
  const dz = player.position.z - PLATO.z;
  const frente = dx * FRENTE.x + dz * FRENTE.z;
  const lado = dx * LADO.x + dz * LADO.z;
  camino = lado < PLATO_BORDE ? [enElMundo([PLATO_EN[0] + (frente > 0 ? 0.95 : -0.7), PLATO_EN[1] + PLATO_BORDE]), sitio] : [sitio];
  seguirCamino();
  setEncendido({ fase: 'camino', desde: performance.now() });
}

// One strike of a stone on the other (a click, a tap or a key).
export function golpearPedernal() {
  if (useChozaStore.getState().encendido?.fase !== 'chispa') return;
  const now = performance.now();
  if (now - encendidoVivo.golpeAt < GOLPE_MS) return;
  encendidoVivo.golpeAt = now;
  encendidoVivo.brasa = Math.min(1, encendidoVivo.brasa + BRASA.golpe);
  playSfx('d2_espada_impacto', { volume: 0.3, rate: 1.9 });
}

// The avatar kneels by the plate, the flint in its left hand and the pyrite in its right.
function arrodillar() {
  const player = usePlayerStore.getState();
  const height = findCharacter(useAuthStore.getState().user?.avatarName).height;
  const sitio = enElMundo([PLATO_EN[0], PLATO_EN[1] + LEJOS * height]);
  pose.feet.set(sitio.x, player.position.y, sitio.z);
  pose.sway.copy(LADO).multiplyScalar(-INCLINA * height);
  manos.copy(pose.feet).addScaledVector(LADO, -MANOS.frente * height);
  manos.y += MANOS.alto * height;
  pose.left!.copy(manos).addScaledVector(FRENTE, -0.045);
  pose.reach = 0;
  moverPirita(performance.now());
  player.setGuide({ walkTo: null });
  player.setPose(pose);
  player.setWear({ url: PIRITA_URL, gesture: 'UseCompass', grip: PIRITA, left: { url: PEDERNAL_URL, grip: PEDERNAL } });
}

// The pyrite comes down on the flint with each strike and goes back up.
function moverPirita(now: number) {
  const t = (now - encendidoVivo.golpeAt) / GOLPE_MS;
  const up = t < 0 || t > 2 ? 1 : t < 1 ? 1 - t : t - 1;
  pose.hand.copy(manos).addScaledVector(FRENTE, 0.045);
  pose.hand.y += 0.02 + ALZADO * up;
}

// Ends the lighting, whatever its step: the avatar and the camera go back to the player.
export function terminarEncendido() {
  if (!useChozaStore.getState().encendido) return;
  camino = [];
  encendidoVivo.llamas = 0;
  setEncendido(null);
  const player = usePlayerStore.getState();
  player.setGuide(null);
  player.setPose(null);
  player.setWear(null);
}

// The lighting, one frame further (called by the scene).
export function avanzarEncendido(now: number, delta: number) {
  const { encendido } = useChozaStore.getState();
  if (!encendido) return;
  const player = usePlayerStore.getState();
  if (player.health <= 0 || useUIStore.getState().dialog !== null) return terminarEncendido();
  const elapsed = now - encendido.desde;

  if (encendido.fase === 'camino') {
    const next = camino[0];
    if (next && elapsed < CAMINO_MAX_MS) {
      if (Math.hypot(player.position.x - next.x, player.position.z - next.z) > CAMINO_CERCA) return;
      camino.shift();
      seguirCamino();
      if (camino.length) return;
    }
    camino = [];
    arrodillar();
    return setEncendido({ fase: 'agacha', desde: now });
  }

  if (encendido.fase === 'agacha') {
    // The hands come over the plate in the second half of kneeling down.
    pose.reach = Math.min(1, Math.max(0, (elapsed / AGACHA_MS - 0.5) * 2));
    if (elapsed >= AGACHA_MS) setEncendido({ fase: 'chispa', desde: now });
    return;
  }

  if (encendido.fase === 'chispa') {
    pose.reach = 1;
    moverPirita(now);
    if (encendidoVivo.brasa >= 1) {
      playSfx('d1_estatua_fuego');
      return setEncendido({ fase: 'llamas', desde: now });
    }
    encendidoVivo.brasa = Math.max(0, encendidoVivo.brasa - BRASA.enfria * delta);
    return;
  }

  // The flames rise; the avatar gets up and steps back from them.
  encendidoVivo.llamas = Math.min(1, elapsed / LLAMAS_MS);
  const lejosDe = (punto: { x: number; z: number }) => Math.hypot(player.position.x - punto.x, player.position.z - punto.z);
  if (retirado === 0 && elapsed > RETIRO_MS) {
    retirado = 1;
    player.setPose(null);
    player.setWear(null);
    player.setGuide({ walkTo: { x: RETIRO.x, y: player.position.y, z: RETIRO.z } });
  } else if (retirado === 1 && lejosDe(RETIRO) < CAMINO_CERCA) {
    retirado = 2;
    player.setGuide({ walkTo: { x: DE_FRENTE.x, y: player.position.y, z: DE_FRENTE.z } });
  } else if (retirado === 2 && lejosDe(DE_FRENTE) < DE_FRENTE_CERCA) {
    retirado = 3;
    player.setGuide({ walkTo: null });
  }
  if (elapsed < LLAMAS_MS) return;
  terminarEncendido();
  saveProgress({ estatuaEncendida: true });
  useUIStore.getState().openDialog(DIALOG.estatua);
}
