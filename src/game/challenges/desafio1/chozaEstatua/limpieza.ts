import { create } from 'zustand';
import { MathUtils, Vector3 } from 'three';
import { findCharacter } from '@/data/characters';
import { loopSfx, playSfx, type Loop } from '@/game/engine/audio/audio';
import type { GestureItem } from '@/game/player/gestureTable';
import { usePlayerStore, type ScenePose } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// Bonus 1, first step: the avatar cleans the moss off the statue's face by hand, with an old rag. The player holds the
// button (or E) and the avatar rubs; the moss comes off zone by zone (forehead, eyes, mouth). Nothing is saved until
// the face is clean: leaving half-way keeps what was cleaned only for this session.

// The statue ("ChozaInterior" of Map.blend, 1.9 m on its slab): the middle of its face (x, z), where it faces, and the
// avatar's left when standing in front of it.
const ROSTRO = [-62.86, -94.18] as const;
export const FRENTE = new Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2);
export const LADO = new Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
// The avatar looks at the statue (yaw around +y; 0 faces +z).
const YAW = -Math.PI / 4;
// Top of the slab the statue stands on: the avatar steps on it to reach.
export const LOSA_Y = 9.453;
// The zones of moss, top to bottom: their node of the model and the height the hand rubs at.
export const ZONAS = [
  { node: 'EstatuaMohoFrente', y: 11.08 },
  { node: 'EstatuaMohoOjos', y: 10.98 },
  { node: 'EstatuaMohoBoca', y: 10.86 },
] as const;
// The statue's shoulder, where the avatar's left hand rests.
const HOMBRO = new Vector3(-62.93, 10.72, -94.1).addScaledVector(LADO, 0.26).addScaledVector(FRENTE, 0.16);

// Where the avatar stands, from its height (m): this far in front of the face, leaning in by this much at the
// shoulders. The forehead has to be within reach (no higher than ALCANCE of its height above its feet): whoever is too
// short for that gets a stool on the slab, and the tall ones need none.
const PIES = { base: 0.24, porAltura: 0.15 };
const INCLINACION = 0.11;
const ALCANCE = 0.97;
const BANCO_MIN = 0.08;
// The wrist stays this far off the stone and this far below the middle of the zone (the hand rises from it, palm and
// rag on the face), and draws circles of this radius, this fast (rad/s).
const MANO_LEJOS = 0.03;
const MUNECA_BAJO = 0.1;
// The rubbing is a wiping by hand, not a machine's circle: wide strokes from side to side (ANCHO) that drift up and
// down (ALTO), each a little different from the last; the hand presses in and eases off (APRIETA), tilts into each
// stroke (LADEO), and the shoulders go along with it (CUERPO). It picks up and comes to rest over a moment (ARRANQUE,
// 1/s) instead of starting and stopping dead.
const ANCHO = 0.075;
const ALTO = 0.04;
const APRIETA = 0.018;
const LADEO = 0.45;
const CUERPO = 0.028;
const GIRO = 7.5;
const ARRANQUE = 6;
// Seconds of rubbing each zone takes, how fast the hand moves to the next one (1/s), how long walking up to the
// statue may take and how long the arm takes to come down at the end.
const ZONA_SEGUNDOS = 4;
const CAMBIO = 5;
const CAMINO_MAX_MS = 6000;
const CAMINO_CERCA = 0.3;
const FIN_MS = 900;
// The way up to the statue, as [in front of the face, to the avatar's left] (m). The stone plate lies right in front of
// the statue (PLATO): whoever comes from beyond it walks around it, by the left unless they are already on its right,
// and never over it. The last point is by the slab (the statue itself is solid).
const PLATO = { frente: 1.36, radio: 0.75 };
const RODEO: readonly (readonly [number, number])[] = [
  [2.05, 0.85],
  [1.15, 0.9],
];
const LLEGADA = [0.8, 0.25] as const;
export const enElMundo = ([frente, lado]: readonly [number, number]) => ({ x: ROSTRO[0] + FRENTE.x * frente + LADO.x * lado, z: ROSTRO[1] + FRENTE.z * frente + LADO.z * lado });

// The rag ("Trapo.blend" of the objects folder): a square of old linen. In the right hand it is held by its middle,
// under the palm, with its folds falling toward what it wipes (not over the back of the hand). When nobody holds it, it lies on the statue's slab, to one side of
// the statue and away from the fire (TRAPO_SITIO: where, and turned how).
export const TRAPO_URL = '/models-3d/objects/Trapo.glb';
const TRAPO: GestureItem = { hand: 'right', size: 0.26, byEnd: false, along: 'knuckles', flip: true, turn: 270, handle: 0.08, offset: [0, 0.02, 0.025], held: [0, 99] };
export const TRAPO_SITIO = { position: [-63.21, LOSA_Y + 0.145, -94.6] as const, yaw: 0.5 };

type Limpieza = { fase: 'camino' | 'frota' | 'fin'; desde: number };
// Lighting the fire (encendido.ts): walking to the plate, kneeling down, striking sparks, the flames rising.
export type Encendido = { fase: 'camino' | 'agacha' | 'chispa' | 'llamas'; desde: number };
// Taking the ring (anillo.ts): walking up to the statue, reaching for it, lifting it, looking at it.
export type Anillo = { fase: 'camino' | 'alcanza' | 'alza' | 'mira'; desde: number };
type Punto = { x: number; z: number };
type ChozaState = {
  limpieza: Limpieza | null;
  // The statue was examined (its inscription read) in this session: from then on E cleans straight away.
  examinada: boolean;
  encendido: Encendido | null;
  anillo: Anillo | null;
  setLimpieza: (limpieza: Limpieza | null) => void;
  setEncendido: (encendido: Encendido | null) => void;
  setAnillo: (anillo: Anillo | null) => void;
  setExaminada: () => void;
};
export const useChozaStore = create<ChozaState>((set) => ({
  limpieza: null,
  examinada: false,
  encendido: null,
  setLimpieza: (limpieza) => set({ limpieza }),
  anillo: null,
  setEncendido: (encendido) => set({ encendido }),
  setAnillo: (anillo) => set({ anillo }),
  setExaminada: () => set({ examinada: true }),
}));

// Live values, mutated in place and read every frame by the scene and the HUD: how much is clean (0..3, one per
// zone) and whether the player is rubbing right now.
export const limpiezaViva = { avance: 0, frotando: false };
const pose: ScenePose = {
  clip: 'Idle',
  feet: new Vector3(),
  yaw: YAW,
  sway: new Vector3(),
  elbow: new Vector3(),
  hand: new Vector3(),
  reach: 0,
  touch: true,
  left: HOMBRO,
  // The palm lies on the stone, fingers up.
  palm: FRENTE.clone().negate(),
  fingers: new Vector3(0, 1, 0),
};
// How far the avatar leans in (m, from its height) and how lively the rubbing is right now (0 still .. 1 in full swing).
let inclinado = 0;
let brio = 0;
let banco = 0;
let fase = 0;
let manoY: number = ZONAS[0].y;
let roce: Loop | null = null;
// The points still to walk through on the way to the statue.
let camino: Punto[] = [];

// The stool under a short avatar (null for whoever reaches from the slab).
export const bancoDeLimpieza = () => (banco > 0 ? { x: pose.feet.x, z: pose.feet.z, y: LOSA_Y, alto: banco, yaw: YAW } : null);
// Where the hand is rubbing (world space).
export const manoDeLimpieza = () => pose.hand;

const setLimpieza = (limpieza: Limpieza | null) => useChozaStore.getState().setLimpieza(limpieza);
const callar = () => {
  roce?.stop(0.15);
  roce = null;
};

// E by the statue while its face is under the moss (or the button of its dialog): the avatar walks up to it.
export function empezarLimpieza() {
  const player = usePlayerStore.getState();
  if (useChozaStore.getState().limpieza || useChozaStore.getState().encendido || useProgressStore.getState().progress.estatuaLimpia || player.health <= 0) return;
  limpiezaViva.frotando = false;
  useUIStore.getState().setBackpackOpen(false);
  // Where the player is, seen from the statue's face.
  const dx = player.position.x - ROSTRO[0];
  const dz = player.position.z - ROSTRO[1];
  const frente = dx * FRENTE.x + dz * FRENTE.z;
  const lado = dx * LADO.x + dz * LADO.z;
  const side = lado < -0.4 ? -1 : 1;
  const trasElPlato = frente > PLATO.frente && Math.abs(lado) < PLATO.radio + 0.3;
  camino = [
    ...RODEO.filter(([f], i) => (i === 0 ? trasElPlato : frente > f + 0.1)).map(([f, l]) => enElMundo([f, l * side])),
    enElMundo([LLEGADA[0], LLEGADA[1] * side]),
  ];
  seguirCamino();
  setLimpieza({ fase: 'camino', desde: performance.now() });
}

function seguirCamino() {
  const player = usePlayerStore.getState();
  const next = camino[0];
  player.setGuide({ walkTo: next ? { x: next.x, y: player.position.y, z: next.z } : null });
}

// The player holds (true) or lets go of (false) the button.
export function frotar(on: boolean) {
  limpiezaViva.frotando = on && useChozaStore.getState().limpieza?.fase === 'frota';
}

// The avatar takes its place in front of the face, on the slab (on a stool if it is short), rag in hand.
function subirAvatar() {
  const player = usePlayerStore.getState();
  const height = findCharacter(useAuthStore.getState().user?.avatarName).height;
  const lift = ZONAS[0].y - LOSA_Y - ALCANCE * height;
  banco = lift > BANCO_MIN ? lift : 0;
  const lejos = PIES.base + PIES.porAltura * height;
  pose.feet.set(ROSTRO[0] + FRENTE.x * lejos, LOSA_Y + banco, ROSTRO[1] + FRENTE.z * lejos);
  inclinado = INCLINACION * height;
  pose.sway.copy(FRENTE).multiplyScalar(-inclinado);
  brio = 0;
  pose.reach = 0;
  const zona = Math.min(ZONAS.length - 1, Math.floor(limpiezaViva.avance));
  manoY = ZONAS[zona].y;
  moverMano(0);
  player.setGuide({ walkTo: null });
  player.setPose(pose);
  player.setWear({ url: TRAPO_URL, gesture: 'UseCompass', grip: TRAPO });
}

// The hand on the face, wiping the zone being cleaned (see ANCHO and the rest).
function moverMano(delta: number) {
  brio = MathUtils.damp(brio, limpiezaViva.frotando ? 1 : 0, ARRANQUE, delta);
  // Each stroke takes its own time: quicker through the middle, slower at the turns.
  fase += GIRO * delta * brio * (1 + 0.28 * Math.sin(fase * 2 + 0.4));
  const reach = 1 + 0.22 * Math.sin(fase * 0.31 + 1.2);
  const aside = Math.sin(fase) * ANCHO * reach;
  const up = Math.sin(fase * 2 + 0.7) * ALTO * 0.5 + Math.sin(fase * 0.43) * ALTO * 0.6;
  const off = MANO_LEJOS + APRIETA * (0.5 - 0.5 * Math.cos(fase * 2)) * brio + 0.03 * (1 - brio);
  pose.hand.set(ROSTRO[0] + FRENTE.x * off + LADO.x * aside, manoY - MUNECA_BAJO + up, ROSTRO[1] + FRENTE.z * off + LADO.z * aside);
  // The fingers lead each stroke and the shoulders follow the hand.
  const lean = Math.cos(fase) * LADEO * brio;
  pose.fingers!.set(LADO.x * lean, 1, LADO.z * lean);
  const along = Math.sin(fase - 0.5) * CUERPO * brio;
  const breathe = Math.sin(fase * 2) * 0.008 * brio;
  pose.sway.set(-FRENTE.x * (inclinado + breathe) + LADO.x * along, 0, -FRENTE.z * (inclinado + breathe) + LADO.z * along);
}

// Ends the cleaning, whatever its step: the avatar and the camera go back to the player. What was cleaned stays (for
// this session) unless the face got clean, which is saved.
export function terminarLimpieza() {
  if (!useChozaStore.getState().limpieza) return;
  callar();
  limpiezaViva.frotando = false;
  banco = 0;
  camino = [];
  setLimpieza(null);
  const player = usePlayerStore.getState();
  player.setGuide(null);
  player.setPose(null);
  player.setWear(null);
}

// The cleaning, one frame further (called by the scene).
export function avanzarLimpieza(now: number, delta: number) {
  const { limpieza } = useChozaStore.getState();
  if (!limpieza) return;
  const player = usePlayerStore.getState();
  if (player.health <= 0 || useUIStore.getState().dialog !== null) return terminarLimpieza();
  const elapsed = now - limpieza.desde;

  if (limpieza.fase === 'camino') {
    const next = camino[0];
    if (next && elapsed < CAMINO_MAX_MS) {
      if (Math.hypot(player.position.x - next.x, player.position.z - next.z) > CAMINO_CERCA) return;
      camino.shift();
      seguirCamino();
      if (camino.length) return;
    }
    camino = [];
    subirAvatar();
    return setLimpieza({ fase: 'frota', desde: now });
  }

  if (limpieza.fase === 'frota') {
    pose.reach = Math.min(1, pose.reach + delta * 2.5);
    const before = Math.floor(limpiezaViva.avance);
    if (limpiezaViva.frotando) limpiezaViva.avance = Math.min(ZONAS.length, limpiezaViva.avance + delta / ZONA_SEGUNDOS);
    const zona = Math.floor(limpiezaViva.avance);
    manoY = MathUtils.damp(manoY, ZONAS[Math.min(ZONAS.length - 1, zona)].y, CAMBIO, delta);
    moverMano(delta);
    if (limpiezaViva.frotando && !roce) roce = loopSfx('d1_estatua_limpiar', 0.7);
    else if (!limpiezaViva.frotando) callar();
    if (zona > before) playSfx('ui_recoger', { volume: 0.5 });
    if (zona >= ZONAS.length) {
      callar();
      limpiezaViva.frotando = false;
      setLimpieza({ fase: 'fin', desde: now });
    }
    return;
  }

  // The arm comes down; then the clean face is saved and told.
  pose.reach = Math.max(0, 1 - elapsed / FIN_MS);
  if (elapsed < FIN_MS) return;
  terminarLimpieza();
  saveProgress({ estatuaLimpia: true });
  useUIStore.getState().openDialog(DIALOG.estatua);
}
