import { CatmullRomCurve3, Vector3 } from 'three';
import { playSfx, shout } from '@/game/engine/audio/audio';
import { useGestureStore } from '@/game/player/gestureStore';
import { usePlayerStore, type ScenePose } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { ESPADA_URL } from '../items';
import { empezarAuxilio } from './auxilio';
import { useClaroStore, type Rescate } from './claroStore';
import { HADA_PEDESTAL } from './lugares';

// Bonus 2, first step: the bramble trap is three thick stalks that climb the pedestal and close a cage over the
// fairy. Her light runs down each stalk as a pulse of sap; when it reaches the knot of the stalk, the knot glows for
// a moment: that is when to swing the elven sword. A swing in time cuts the stalk, which recoils and withers; one out
// of time bounces off, the brambles tighten and the same knot is tried again. With the three cut the cage is open and
// the fairy falls out of it (auxilio.ts). Nothing is saved here: leaving half-way keeps what was cut only for this
// session.

type Tallo = {
  // Nodes of the model ("ClaroInteractivos" of Map.blend): the stalk above the knot, the knot and the stump left.
  tallo: string;
  nudo: string;
  tocon: string;
  // Middle of the knot and where the avatar stands to cut it (x, z).
  en: Vector3;
  pie: { x: number; z: number };
  // The way of the pulse of sap, from the fairy down to the knot.
  pulso: CatmullRomCurve3;
};

const LUZ: readonly [number, number, number] = [HADA_PEDESTAL[0], HADA_PEDESTAL[1] + 0.5, HADA_PEDESTAL[2]];
const tallo = (id: string, nudo: readonly [number, number, number], pie: readonly [number, number], pulso: readonly (readonly [number, number, number])[]): Tallo => ({
  tallo: `ZarzaTallo${id}`,
  nudo: `ZarzaNudo${id}`,
  tocon: `ZarzaTocon${id}`,
  en: new Vector3(...nudo),
  pie: { x: pie[0], z: pie[1] },
  pulso: new CatmullRomCurve3([LUZ, ...pulso, nudo].map((p) => new Vector3(...p))),
});

// Measured on Map.blend by the script that built the stalks (its report lists knot, standing place and path).
export const TALLOS: readonly Tallo[] = [
  tallo('A', [41.732, 15.246, -229.0], [42.555, -228.525], [
    [40.279, 16.45, -230.324], [40.51, 16.53, -229.983], [40.643, 16.37, -229.513], [40.79, 16.09, -229.128], [41.116, 15.776, -229.033], [41.343, 15.506, -229.086],
  ]),
  tallo('B', [40.0, 15.191, -232.0], [40.0, -232.95], [
    [39.58, 16.45, -230.08], [39.76, 16.53, -230.45], [40.1, 16.37, -230.8], [40.36, 16.09, -231.12], [40.28, 15.77, -231.45], [40.12, 15.451, -231.62],
  ]),
  tallo('C', [38.268, 15.249, -229.0], [37.445, -228.525], [
    [40.141, 16.45, -229.596], [39.73, 16.53, -229.567], [39.257, 16.37, -229.687], [38.85, 16.09, -229.752], [38.604, 15.779, -229.517], [38.537, 15.509, -229.294],
  ]),
];

// Seconds a pulse takes from the fairy to each knot: every stalk is a little quicker than the one before.
const PERIODO = [1.6, 1.3, 1.0] as const;
// The knot glows from this long before the pulse arrives to this long after it (s): the swing counts within it. Two
// misses in a row on the same knot widen it, up to VENTANA_MAX.
const VENTANA = 0.2;
const VENTANA_MAS = 0.07;
const VENTANA_MAX = 0.36;
// The avatar goes around the pedestal at this distance from its middle (m), in steps of this angle.
const RODEO = 3.25;
const RODEO_PASO = Math.PI / 5;
const CAMINO_MAX_MS = 9000;
const CAMINO_CERCA = 0.3;
// A swing that never lands (no gesture clip) is settled after this long; the stalk takes SECA_MS to recoil and
// wither, the brambles APRIETA_MS to tighten and loosen, and the sword FIN_MS to come down at the end.
const TAJO_MAX_MS = 900;
const SECA_MS = 1100;
const APRIETA_MS = 900;
const FIN_MS = 500;

export { useClaroStore };
export type { Rescate };

// Live values, mutated in place and read every frame by the scene and the HUD:
// cortados: stalks cut in this session (0..3); fallos: misses in a row on the knot in turn;
// pulso: how far down the stalk the pulse is (0 by the fairy .. 1 at the knot); falta: seconds until it arrives
// (negative once it has); brillo: how much the knot glows (0..1); acierto: whether the swing in the air was in time;
// seca / aprieta: how far the recoil of a cut stalk or the tightening after a miss is (0..1);
// pantalla: where the knot is on screen (fractions of its width and height), for the ring of the HUD.
export const rescateVivo = { cortados: 0, fallos: 0, pulso: 0, falta: 0, brillo: 0, acierto: false, seca: 0, aprieta: 0, pantalla: { x: 0.5, y: 0.5, visible: false } };

// ?dev=claroManos: the three stalks already cut, the fairy on the ground waiting for a hand.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('dev') === 'claroManos') rescateVivo.cortados = 3;

const pose: ScenePose = { clip: 'Idle', feet: new Vector3(), yaw: 0, sway: new Vector3(), elbow: new Vector3(), hand: new Vector3(), reach: 0, touch: true };
let camino: { x: number; z: number }[] = [];
// The fairy tells how to cut the first time, in each session.
let avisado = false;
export const PISTA = 'Hada: «Corta solo cuando el nudo brille. Si cortas a destiempo, se cierra».';

const setRescate = (rescate: Rescate | null) => useClaroStore.getState().setRescate(rescate);
const ventana = () => Math.min(VENTANA_MAX, VENTANA + VENTANA_MAS * Math.floor(rescateVivo.fallos / 2));
export const talloEnTurno = () => TALLOS[Math.min(TALLOS.length - 1, rescateVivo.cortados)];

function seguirCamino() {
  const player = usePlayerStore.getState();
  const next = camino[0];
  player.setGuide({ walkTo: next ? { x: next.x, y: player.position.y, z: next.z } : null });
}

// The way to the standing place of the knot in turn: straight if it is near, around the pedestal otherwise (by the
// shorter side), never across it.
function irAlNudo(now: number) {
  const player = usePlayerStore.getState();
  const { pie } = talloEnTurno();
  const [cx, , cz] = HADA_PEDESTAL;
  const from = Math.atan2(player.position.x - cx, player.position.z - cz);
  const to = Math.atan2(pie.x - cx, pie.z - cz);
  const turn = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const steps = Math.floor(Math.abs(turn) / RODEO_PASO);
  camino = [];
  for (let i = 1; i <= steps; i++) {
    const angle = from + (turn * i) / (steps + 1);
    camino.push({ x: cx + Math.sin(angle) * RODEO, z: cz + Math.cos(angle) * RODEO });
  }
  camino.push(pie);
  player.setPose(null);
  seguirCamino();
  setRescate({ fase: 'camino', desde: now });
}

// E by the brambles with the elven sword: the avatar draws it and walks to the first knot still uncut.
export function empezarRescate() {
  const player = usePlayerStore.getState();
  const { rescate, auxilio } = useClaroStore.getState();
  if (rescate || auxilio || useProgressStore.getState().progress.hadaLiberada || player.health <= 0) return;
  // The cage was already open (it was left for later): she is on the ground, waiting for a hand.
  if (rescateVivo.cortados >= TALLOS.length) return empezarAuxilio();
  if (!avisado) {
    avisado = true;
    useToastStore.getState().showToast(PISTA);
  }
  rescateVivo.fallos = 0;
  rescateVivo.seca = 0;
  rescateVivo.aprieta = 0;
  rescateVivo.brillo = 0;
  useUIStore.getState().setBackpackOpen(false);
  player.setWear({ url: ESPADA_URL, gesture: 'UseSlash' });
  playSfx('d2_espada_desenvainar');
  irAlNudo(performance.now());
}

// The avatar stands in front of the knot, facing it, sword in hand.
function plantarse() {
  const player = usePlayerStore.getState();
  const { en, pie } = talloEnTurno();
  pose.feet.set(pie.x, player.position.y, pie.z);
  pose.yaw = Math.atan2(en.x - pie.x, en.z - pie.z);
  player.setGuide({ walkTo: null });
  player.setPose(pose);
}

// The swing has landed: in time, the stalk is cut; out of time, the sword bounces and the brambles tighten.
function impacto() {
  if (useClaroStore.getState().rescate?.fase !== 'tajo') return;
  const now = performance.now();
  if (rescateVivo.acierto) {
    playSfx('d2_zarzas');
    rescateVivo.cortados += 1;
    rescateVivo.fallos = 0;
    rescateVivo.seca = 0;
    if (rescateVivo.cortados < TALLOS.length) shout('02_hada_09', { volume: 0.9 });
    return setRescate({ fase: 'seca', desde: now });
  }
  playSfx('d2_espada_impacto', { volume: 0.8 });
  playSfx('d2_zarzas_aprietan', { volume: 0.8 });
  shout('02_hada_08', { volume: 0.9 });
  rescateVivo.fallos += 1;
  rescateVivo.aprieta = 0;
  setRescate({ fase: 'aprieta', desde: now });
}

// One swing of the sword (a click, a tap or a key): it is judged now and lands a moment later, with the gesture.
export function tajar() {
  const { rescate } = useClaroStore.getState();
  if (rescate?.fase !== 'acecho') return;
  rescateVivo.acierto = Math.abs(rescateVivo.falta) <= ventana();
  playSfx('d2_espada_tajo');
  useGestureStore.getState().play('UseSlash', null, impacto);
  setRescate({ fase: 'tajo', desde: performance.now() });
}

// Ends the rescue, whatever its step: the avatar and the camera go back to the player. The stalks already cut stay
// cut for this session.
export function terminarRescate() {
  if (!useClaroStore.getState().rescate) return;
  camino = [];
  rescateVivo.brillo = 0;
  rescateVivo.aprieta = 0;
  rescateVivo.pantalla.visible = false;
  setRescate(null);
  const player = usePlayerStore.getState();
  player.setGuide(null);
  player.setPose(null);
  player.setWear(null);
}

// Where the pulse is and how much the knot glows, `segundos` into the watch of this knot.
function latir(segundos: number) {
  const periodo = PERIODO[Math.min(PERIODO.length - 1, rescateVivo.cortados)];
  const fase = (segundos % periodo) / periodo;
  // Seconds to the nearest arrival: the one coming, or the one just gone while the knot still glows.
  const coming = (1 - fase) * periodo;
  const gone = fase * periodo;
  const w = ventana();
  rescateVivo.falta = gone <= w && segundos >= periodo ? -gone : coming;
  rescateVivo.pulso = fase;
  const lejos = Math.abs(rescateVivo.falta);
  rescateVivo.brillo = lejos <= w ? 1 : Math.max(0, 1 - (lejos - w) / 0.18);
}

// The rescue, one frame further (called by the scene).
export function avanzarRescate(now: number) {
  const { rescate } = useClaroStore.getState();
  if (!rescate) return;
  const player = usePlayerStore.getState();
  if (player.health <= 0 || useUIStore.getState().dialog !== null) return terminarRescate();
  const elapsed = now - rescate.desde;

  if (rescate.fase === 'camino') {
    const next = camino[0];
    if (next && elapsed < CAMINO_MAX_MS) {
      if (Math.hypot(player.position.x - next.x, player.position.z - next.z) > CAMINO_CERCA) return;
      camino.shift();
      seguirCamino();
      if (camino.length) return;
    }
    camino = [];
    plantarse();
    return setRescate({ fase: 'acecho', desde: now });
  }

  if (rescate.fase === 'acecho') return latir(elapsed / 1000);

  if (rescate.fase === 'tajo') {
    if (elapsed > TAJO_MAX_MS) impacto();
    return;
  }

  if (rescate.fase === 'aprieta') {
    rescateVivo.aprieta = Math.min(1, elapsed / APRIETA_MS);
    rescateVivo.brillo = Math.max(0, rescateVivo.brillo - 0.05);
    if (elapsed >= APRIETA_MS) {
      rescateVivo.aprieta = 0;
      setRescate({ fase: 'acecho', desde: now });
    }
    return;
  }

  if (rescate.fase === 'seca') {
    rescateVivo.seca = Math.min(1, elapsed / SECA_MS);
    rescateVivo.brillo = 0;
    if (elapsed < SECA_MS) return;
    rescateVivo.seca = 0;
    if (rescateVivo.cortados < TALLOS.length) return irAlNudo(now);
    player.setWear(null);
    return setRescate({ fase: 'fin', desde: now });
  }

  // The cage is open: the fairy falls out of it, too weak to fly.
  if (elapsed < FIN_MS) return;
  terminarRescate();
  empezarAuxilio();
}
