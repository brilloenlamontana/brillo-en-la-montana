import { MathUtils, Vector3 } from 'three';
import { playSfx, playVoice } from '@/game/engine/audio/audio';
import { usePlayerStore, type ScenePose } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { useClaroStore, type Auxilio } from './claroStore';
import { hadaEscena } from './hadaViva';
import { AUXILIO_RODILLA, HADA_PEDESTAL, HADA_SUELO } from './lugares';

// Bonus 2, second step: the cage is open but the fairy cannot fly, one wing crumpled by the brambles. She flutters,
// falls to the ground by the pedestal and the avatar kneels by her and holds out a hand. The player keeps the button
// down while she gathers strength (she gets up, her wings unfold and light up) and lets go to send her off: she takes
// off and the clearing wakes around her. Being freed is saved when she takes off.

const SUELO = new Vector3(...HADA_SUELO);
const PEDESTAL = new Vector3(...HADA_PEDESTAL);
// From the fairy on the ground toward the avatar kneeling by her (unit, flat).
const HACIA_AVATAR = new Vector3(AUXILIO_RODILLA.x - SUELO.x, 0, AUXILIO_RODILLA.z - SUELO.z).normalize();
// The avatar comes to its place from a little farther out, so that it is left facing her.
const LLEGADA = { x: AUXILIO_RODILLA.x + HACIA_AVATAR.x * 0.6, z: AUXILIO_RODILLA.z + HACIA_AVATAR.z * 0.6 };
// The hand the avatar holds out: this far from her toward the avatar and this high above the ground (m).
const MANO = { lejos: 0.26, alto: 0.4 };

// She flutters up for REVOLOTEO_MS and falls for the rest of CAE_MS; kneeling takes its clip (ARRODILLA_MS); she
// needs SEGUNDOS of a held hand, and stands up at LEVANTA of them; let go, she takes DESPEGA_MS to rise (her clip
// crouches for IMPULSO_MS first) and the clearing takes DESPIERTA_MS to wake (its lights spread during ONDA_MS; she
// comes down to the avatar at BAJA_MS). Held longer than SUELTA_SOLA_MS once she is ready, she goes by herself.
const REVOLOTEO_MS = 600;
const CAE_MS = 1500;
const CAMINO_MAX_MS = 7000;
const CAMINO_CERCA = 0.3;
const ARRODILLA_MS = 1000;
const SEGUNDOS = 3;
const LEVANTA = 0.55;
const SUELTA_SOLA_MS = 5000;
const DESPEGA_MS = 2600;
const IMPULSO_MS = 420;
const DESPIERTA_MS = 7000;
const ONDA_MS = 3200;
const BAJA_MS = 4300;

// Live values, mutated in place and read every frame by the scene and the HUD: her strength (0..1), whether the
// player is holding her hand right now, and how far the waking of the clearing has spread (0..1).
export const auxilioVivo = { fuerza: 0, sosteniendo: false, onda: 0 };

const pose: ScenePose = {
  clip: 'Arrodillarse',
  feet: new Vector3(),
  yaw: Math.atan2(-HACIA_AVATAR.x, -HACIA_AVATAR.z),
  sway: new Vector3(),
  elbow: new Vector3(),
  hand: new Vector3(),
  reach: 0,
  touch: true,
  // The palm up, fingers toward her.
  palm: new Vector3(0, 1, 0),
  fingers: HACIA_AVATAR.clone().negate(),
};
let camino: { x: number; z: number }[] = [];
let voz: (() => void) | null = null;
let levantado = false;

const setAuxilio = (auxilio: Auxilio | null) => useClaroStore.getState().setAuxilio(auxilio);

function seguirCamino() {
  const player = usePlayerStore.getState();
  const next = camino[0];
  player.setGuide({ walkTo: next ? { x: next.x, y: player.position.y, z: next.z } : null });
}

// The cage is open (or E by the fairy on the ground, if it was left for later): she falls and the avatar goes to her.
export function empezarAuxilio() {
  const player = usePlayerStore.getState();
  if (useClaroStore.getState().auxilio || useProgressStore.getState().progress.hadaLiberada || player.health <= 0) return;
  auxilioVivo.fuerza = 0;
  auxilioVivo.sosteniendo = false;
  auxilioVivo.onda = 0;
  levantado = false;
  useUIStore.getState().setBackpackOpen(false);
  hadaEscena.activa = true;
  hadaEscena.clip = 'Volar';
  hadaEscena.luz = 0.6;
  hadaEscena.giro = 0;
  hadaEscena.mira.set(SUELO.x + HACIA_AVATAR.x * 3, SUELO.y, SUELO.z + HACIA_AVATAR.z * 3);
  player.setPose(null);
  player.setWear(null);
  camino = [LLEGADA, AUXILIO_RODILLA];
  seguirCamino();
  voz = playVoice(['02_narrador_12']);
  setAuxilio({ fase: 'cae', desde: performance.now() });
}

// The player holds her hand (true) or lets go (false). Letting go once she is ready sends her off.
export function sostener(on: boolean) {
  const fase = useClaroStore.getState().auxilio?.fase;
  if (fase === 'lista' && !on && auxilioVivo.sosteniendo) return despegar();
  auxilioVivo.sosteniendo = on && (fase === 'sostiene' || fase === 'lista');
}

function despegar() {
  auxilioVivo.sosteniendo = false;
  playSfx('d2_hada_libre', { volume: 0.8 });
  saveProgress({ hadaLiberada: true });
  hadaEscena.clip = 'Despegar';
  setAuxilio({ fase: 'despega', desde: performance.now() });
}

// The avatar kneels by her, its right hand held out, palm up.
function arrodillar() {
  const player = usePlayerStore.getState();
  pose.feet.set(AUXILIO_RODILLA.x, player.position.y, AUXILIO_RODILLA.z);
  pose.hand.copy(SUELO).addScaledVector(HACIA_AVATAR, MANO.lejos);
  pose.hand.y += MANO.alto;
  pose.reach = 0;
  player.setGuide({ walkTo: null });
  player.setPose(pose);
}

// Ends it, whatever its step: the fairy, the avatar and the camera go back to the game. Unless she already took off
// (which is saved), she stays on the ground waiting for help.
export function terminarAuxilio() {
  if (!useClaroStore.getState().auxilio) return;
  camino = [];
  auxilioVivo.sosteniendo = false;
  hadaEscena.activa = false;
  hadaEscena.luz = 1;
  setAuxilio(null);
  const player = usePlayerStore.getState();
  player.setGuide(null);
  player.setPose(null);
}

// The avatar walks to its place by her; true once it is there (or it took too long).
function llegar(elapsed: number) {
  const player = usePlayerStore.getState();
  const next = camino[0];
  if (next && elapsed < CAMINO_MAX_MS) {
    if (Math.hypot(player.position.x - next.x, player.position.z - next.z) > CAMINO_CERCA) return false;
    camino.shift();
    seguirCamino();
    if (camino.length) return false;
  }
  camino = [];
  return true;
}

// One frame further (called by the scene).
export function avanzarAuxilio(now: number, delta: number) {
  const { auxilio } = useClaroStore.getState();
  if (!auxilio) return;
  const player = usePlayerStore.getState();
  if (player.health <= 0 || useUIStore.getState().dialog !== null) {
    voz?.();
    return terminarAuxilio();
  }
  const elapsed = now - auxilio.desde;
  const hada = hadaEscena.position;

  if (auxilio.fase === 'cae') {
    llegar(elapsed);
    if (elapsed < REVOLOTEO_MS) {
      // She tries her wings over the pedestal...
      hada.copy(PEDESTAL);
      hada.y += 0.45 * Math.sin((Math.PI / 2) * (elapsed / REVOLOTEO_MS));
    } else {
      // ...and falls in an arc to the ground.
      const t = Math.min(1, (elapsed - REVOLOTEO_MS) / (CAE_MS - REVOLOTEO_MS));
      hada.lerpVectors(PEDESTAL, SUELO, MathUtils.smoothstep(t, 0, 1));
      hada.y = MathUtils.lerp(PEDESTAL.y + 0.45, SUELO.y, t * t);
    }
    if (elapsed < CAE_MS) return;
    hada.copy(SUELO);
    hadaEscena.clip = 'Herida';
    playSfx('jug_aterrizaje', { volume: 0.35, rate: 1.5 });
    return setAuxilio({ fase: 'camino', desde: now });
  }

  if (auxilio.fase === 'camino') {
    if (!llegar(elapsed)) return;
    arrodillar();
    return setAuxilio({ fase: 'arrodilla', desde: now });
  }

  if (auxilio.fase === 'arrodilla') {
    // The hand comes forward in the second half of kneeling down.
    pose.reach = Math.min(1, Math.max(0, (elapsed / ARRODILLA_MS - 0.5) * 2));
    if (elapsed >= ARRODILLA_MS) setAuxilio({ fase: 'sostiene', desde: now });
    return;
  }

  if (auxilio.fase === 'sostiene' || auxilio.fase === 'lista') {
    pose.reach = 1;
    if (auxilioVivo.sosteniendo) auxilioVivo.fuerza = Math.min(1, auxilioVivo.fuerza + delta / SEGUNDOS);
    // She gets up, holding on to the hand, as her strength comes back.
    if (!levantado && auxilioVivo.fuerza >= LEVANTA) {
      levantado = true;
      hadaEscena.clip = 'Idle';
      playSfx('ui_recoger', { volume: 0.5 });
    }
    hadaEscena.luz = 0.6 + 1.1 * auxilioVivo.fuerza;
    if (auxilio.fase === 'sostiene') {
      if (auxilioVivo.fuerza >= 1) setAuxilio({ fase: 'lista', desde: now });
    } else if (elapsed > SUELTA_SOLA_MS) {
      despegar();
    }
    return;
  }

  if (auxilio.fase === 'despega') {
    // The hand follows her up for a moment; then the avatar stands.
    pose.hand.y = SUELO.y + MANO.alto + 0.3 * Math.min(1, elapsed / 500);
    pose.reach = Math.max(0, 1 - Math.max(0, elapsed - 500) / 400);
    if (elapsed > 900 && player.pose) {
      player.setPose(null);
      player.setGuide({ walkTo: null });
    }
    if (elapsed > 830) hadaEscena.clip = 'Volar';
    // She rises in a widening spiral that drifts over the pedestal.
    const t = Math.min(1, Math.max(0, elapsed - IMPULSO_MS) / (DESPEGA_MS - IMPULSO_MS));
    const rise = MathUtils.smoothstep(t, 0, 1);
    const angle = t * 7;
    hada.lerpVectors(SUELO, PEDESTAL, rise);
    hada.x += Math.cos(angle) * 1.3 * rise;
    hada.z += Math.sin(angle) * 1.3 * rise;
    hada.y = SUELO.y + (PEDESTAL.y + 1.9 - SUELO.y) * rise;
    hadaEscena.mira.set(hada.x - Math.sin(angle) * 2, hada.y, hada.z + Math.cos(angle) * 2);
    hadaEscena.luz = 1.7 + 0.6 * rise;
    if (elapsed < DESPEGA_MS) return;
    voz = playVoice(['02_hada_01']);
    playSfx('d2_claro_despierta', { volume: 0.8 });
    return setAuxilio({ fase: 'despierta', desde: now });
  }

  // The clearing wakes: its lights spread from the pedestal while she circles above, then she comes down to the avatar.
  auxilioVivo.onda = Math.min(1, elapsed / ONDA_MS);
  const angle = 7 + (elapsed / 1000) * 1.9;
  if (elapsed < BAJA_MS) {
    hada.set(PEDESTAL.x + Math.cos(angle) * 1.3, PEDESTAL.y + 1.9 + 0.25 * Math.sin(elapsed / 300), PEDESTAL.z + Math.sin(angle) * 1.3);
    hadaEscena.mira.set(hada.x - Math.sin(angle) * 2, hada.y, hada.z + Math.cos(angle) * 2);
    hadaEscena.luz = 2.3 - 0.9 * auxilioVivo.onda;
  } else {
    const t = MathUtils.smoothstep((elapsed - BAJA_MS) / 1500, 0, 1);
    const frente = { x: player.position.x - HACIA_AVATAR.x * 1.5, y: player.position.y + 1.05 + 0.1 * Math.sin(elapsed / 260), z: player.position.z - HACIA_AVATAR.z * 1.5 };
    hada.x = MathUtils.damp(hada.x, frente.x, 3, delta * (0.4 + t));
    hada.y = MathUtils.damp(hada.y, frente.y, 3, delta * (0.4 + t));
    hada.z = MathUtils.damp(hada.z, frente.z, 3, delta * (0.4 + t));
    hadaEscena.mira.copy(player.position);
    hadaEscena.luz = 1.4;
  }
  if (elapsed < DESPIERTA_MS) return;
  // The roots of the lectern open as the scene ends: she goes for her amulet.
  playSfx('d2_raices_abren', { volume: 0.7 });
  terminarAuxilio();
}
