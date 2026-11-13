import { Vector3 } from 'three';
import { findCharacter } from '@/data/characters';
import { playSfx } from '@/game/engine/audio/audio';
import { useGestureStore } from '@/game/player/gestureStore';
import { usePlayerStore, type ScenePose } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { isGameplayPaused, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { HEDRIG_COLLECTIBLES } from '../items';
import { MESA_PULSO, OGRO_HALL_Y, OGRO_REPEL_POINT, PULSO_CAMINO, PULSO_CODO, PULSO_REF, PULSO_YAW } from '../lugares';
import { hasCollected, isOgroVencido } from '../mission';
import { useTunelStore, type Pulso } from '../tunelStore';

const toast = (message: string) => useToastStore.getState().showToast(message);

// The Ogre can be challenged from this far from his table (m).
export const RETO_RANGE = 3.2;
// What a blow of his costs (he hits whoever tries to sneak past him).
const GOLPE = 20;
const GUANTE_URL = HEDRIG_COLLECTIBLES[0].url;
// How long putting the glove on takes (its gesture), and until when one is under way.
const GUANTE_MS = 2000;
let poniendoGuanteHasta = 0;

// Getting to the table: the avatar has reached a point of its way this close to it (m); after CAMINO_MAX_MS it is put
// there (something was in the way). Settling takes as long as his 'PulsoAcomodo' clip; the arm stays down for a moment
// once it is decided.
const CAMINO_CERCA = 0.3;
// Feet this close to the hall floor are standing on it (m).
const EN_EL_SUELO = 0.4;
const CAMINO_MAX_MS = 5000;
const ACOMODO_MS = 1300;
const FINAL_MS = { gana: 1100, pierde: 900 } as const;
// The wrestling itself, as a strength from 0 (he pins the player's arm) to 1 (the player pins his); it starts level.
// Every click pushes; he pushes back all the time. With the miner's glove a click counts and he cannot pin the arm
// (it holds at CON_GUANTE.piso) and he tires (his push eases down to cedeMin of itself over cansancioMs, so slow
// clicks win too): about a dozen quick clicks win. Without it a click barely counts, his push grows by
// the second and the strength cannot rise past SIN_GUANTE.techo: he wins in a few seconds, whatever the player does.
const CON_GUANTE = { empuje: 0.075, cede: 0.17, piso: 0.1, cansancioMs: 20000, cedeMin: 0.3 };
const SIN_GUANTE = { empuje: 0.02, cede: 0.1, crece: 0.07, techo: 0.6 };

// The avatar at the table, from its height (the clip 'Pulso' of the shared skeleton, per metre of height): its right
// elbow is this far in front of it, this high and this far to its right. The avatar is drawn where that puts the elbow
// on the table; whoever is too short for it gets a bench (the avatar is drawn that much higher).
const CODO_FRENTE = 0.153;
const CODO_ALTO = 0.708;
const CODO_LADO = 0.073;
const BANCO_MIN = 0.05;
// How far along his hand, from the wrist to the knuckles, the point the wrestling follows is; how far the avatar's
// forearm leans forward to his hand (ADELANTE, as the tangent of the angle); how much it tips over (rad) per metre
// his hand moves sideways, up to TUMBADO (almost flat on the table); and how much of that way the body leans along.
const TALON = 0.45;
const ADELANTE = 0.55;
const VUELCO = 5.5;
const TUMBADO = 1.25;
const VAIVEN = 0.35;

// Live values of the arm wrestling, mutated in place: read every frame by the Ogre and the HUD.
export const pulsoVivo = { fuerza: 0.5 };
const pose: ScenePose = { clip: 'Pulso', feet: new Vector3(), yaw: PULSO_YAW, sway: new Vector3(), elbow: new Vector3(), hand: new Vector3(), reach: 0 };
const talon = new Vector3();
// Height of the bench under the avatar (0 = none).
let banco = 0;
export const bancoDelPulso = () => (banco > 0 ? { feet: pose.feet, alto: banco } : null);

// Whether the player stands by the arm-wrestling table, in the Ogre's hall.
export function isAtMesaPulso() {
  const { x, y, z } = usePlayerStore.getState().position;
  return y > OGRO_HALL_Y[0] && y < OGRO_HALL_Y[1] && Math.hypot(x - MESA_PULSO[0], z - MESA_PULSO[2]) < RETO_RANGE;
}

// The Ogre swings his mace at the player (his 'Attack' clip starts now; the blow lands a moment later).
export function golpeDelOgro() {
  if (usePlayerStore.getState().health <= 0) return;
  useTunelStore.getState().repelerOgro();
  playSfx('d3_ogro_grunido');
}

// The mace lands: it hurts (and can be a defeat). The avatar flinches where it stands.
export function impactoDelOgro() {
  const player = usePlayerStore.getState();
  if (player.health > 0) player.takeDamage(GOLPE);
}

const setPulso = (pulso: Pulso | null) => useTunelStore.getState().setPulso(pulso);
const walkTo = (paso: number) => {
  const [x, z] = PULSO_CAMINO[paso];
  usePlayerStore.getState().setGuide({ walkTo: { x, y: usePlayerStore.getState().position.y, z } });
};

// E by the Ogre's table: whoever carries the miner's glove puts it on first (its gesture), then the challenge begins.
export function desafiarAlOgro() {
  const { progress } = useProgressStore.getState();
  const ready = !isOgroVencido(progress) && useTunelStore.getState().pulso === null && isAtMesaPulso();
  if (!ready || !hasCollected('guante', progress)) return retarAlOgro();
  // Pressed again while the glove goes on: that gesture is already on its way.
  const now = performance.now();
  if (now < poniendoGuanteHasta) return;
  poniendoGuanteHasta = now + GUANTE_MS;
  useGestureStore.getState().play('UseGlove', GUANTE_URL, retarAlOgro);
}

// Challenging the Ogre at his table (using the glove there, or bare-handed): both go to their side of it and the arm
// wrestling is played (avanzarPulso). The miner's glove decides it (see CON_GUANTE and SIN_GUANTE) and stays on the
// avatar's hand all the while.
export function retarAlOgro() {
  const { progress } = useProgressStore.getState();
  const tunel = useTunelStore.getState();
  const player = usePlayerStore.getState();
  if (isOgroVencido(progress)) return toast('El ogro ya te dejó pasar: sube la escalera de piedra hacia la cumbre.');
  if (tunel.pulso !== null || player.health <= 0) return;
  if (!isAtMesaPulso()) return toast('El guante de minero es para el pulso con el ogro: acércate a su mesa, al final de los túneles.');
  pulsoVivo.fuerza = 0.5;
  // From the far side of the table there is no straight way to the near one: the avatar starts from its first point.
  if (player.position.x > PULSO_CAMINO[1][0] + 0.2) {
    const [x, z] = PULSO_CAMINO[0];
    player.requestTeleport({ x, y: OGRO_REPEL_POINT.y, z });
  }
  const conGuante = hasCollected('guante', progress);
  setPulso({ fase: 'camino', desde: performance.now(), conGuante, paso: 0 });
  walkTo(0);
  // The backpack stays shut while they wrestle (its key does nothing while a scene leads the avatar).
  useUIStore.getState().setBackpackOpen(false);
  if (conGuante) player.setWear({ url: GUANTE_URL, gesture: 'UseGlove' });
}

// One click (or tap, or key) of the player during the arm wrestling.
export function empujarPulso() {
  const pulso = useTunelStore.getState().pulso;
  if (pulso?.fase !== 'juego' || isGameplayPaused() || usePlayerStore.getState().health <= 0) return;
  const { empuje } = pulso.conGuante ? CON_GUANTE : SIN_GUANTE;
  pulsoVivo.fuerza = Math.min(pulso.conGuante ? 1 : SIN_GUANTE.techo, pulsoVivo.fuerza + empuje);
  // The push that takes his arm all the way down wins.
  if (pulsoVivo.fuerza >= 1) setPulso({ ...pulso, fase: 'gana', desde: performance.now() });
}

// How far the arms are from level: -1 the Ogre's arm is down (the player won) ... +1 he pins the player's.
export function inclinacionPulso(pulso: Pulso) {
  if (pulso.fase === 'gana') return -1;
  if (pulso.fase === 'pierde') return 1;
  return pulso.fase === 'juego' ? 0.5 - pulsoVivo.fuerza : 0;
}

// The avatar takes its place: drawn at the edge of the table (on a bench if it is short) with its right elbow on it,
// in the pose of the clip.
function sentarAvatar() {
  const player = usePlayerStore.getState();
  const height = findCharacter(useAuthStore.getState().user?.avatarName).height;
  const lift = PULSO_CODO[1] - player.position.y - CODO_ALTO * height;
  banco = lift > BANCO_MIN ? lift : 0;
  pose.feet.set(PULSO_CODO[0] - CODO_FRENTE * height, player.position.y + banco, PULSO_CODO[2] - CODO_LADO * height);
  pose.elbow.set(...PULSO_CODO);
  pose.hand.set(PULSO_CODO[0] + ADELANTE, PULSO_CODO[1] + 1, PULSO_CODO[2]);
  pose.sway.set(0, 0, 0);
  pose.reach = 0;
  player.setPose(pose);
}

// Called by the Ogre every frame with where his wrist and his knuckles are. The avatar's elbow stays on the table and
// its forearm, raised to his hand with the arms level, tips over to the side his hand goes; the body leans along a little.
export function seguirManoDelOgro(muneca: Vector3, nudillos: Vector3, pulso: Pulso, now: number) {
  // The arm goes for his in the second half of settling, once his is on the table.
  pose.reach = pulso.fase === 'acomodo' ? Math.min(1, Math.max(0, ((now - pulso.desde) / ACOMODO_MS - 0.5) * 2)) : 1;
  const aside = talon.copy(muneca).lerp(nudillos, TALON).z - PULSO_REF[2];
  const tilt = Math.min(TUMBADO, Math.max(-TUMBADO, aside * VUELCO));
  pose.hand.set(PULSO_CODO[0] + ADELANTE * Math.cos(tilt), PULSO_CODO[1] + Math.cos(tilt), PULSO_CODO[2] + Math.sin(tilt));
  pose.sway.set(0, 0, aside * VAIVEN * pose.reach);
}

// Ends the arm wrestling, whatever its step: the avatar and the camera go back to the player.
export function terminarPulso() {
  if (useTunelStore.getState().pulso === null) return;
  setPulso(null);
  banco = 0;
  const player = usePlayerStore.getState();
  player.setGuide(null);
  player.setPose(null);
  player.setWear(null);
}

// The arm wrestling, one frame further (called by the Ogre). `ogroEnSuSitio`: he has reached his side of the table.
export function avanzarPulso(now: number, delta: number, ogroEnSuSitio: boolean) {
  const pulso = useTunelStore.getState().pulso;
  if (!pulso) return;
  const player = usePlayerStore.getState();
  if (player.health <= 0) return terminarPulso();
  const elapsed = now - pulso.desde;

  if (pulso.fase === 'camino') {
    const last = PULSO_CAMINO.length - 1;
    const [x, z] = PULSO_CAMINO[Math.min(pulso.paso, last)];
    const near = Math.hypot(player.position.x - x, player.position.z - z) < CAMINO_CERCA;
    if (pulso.paso <= last && !near && elapsed > CAMINO_MAX_MS) {
      const [lx, lz] = PULSO_CAMINO[last];
      player.requestTeleport({ x: lx, y: OGRO_REPEL_POINT.y, z: lz });
      player.setGuide({ walkTo: null });
      return setPulso({ ...pulso, paso: last + 1 });
    }
    if (pulso.paso <= last && near) {
      if (pulso.paso < last) walkTo(pulso.paso + 1);
      return setPulso({ ...pulso, paso: pulso.paso + 1 });
    }
    // (Put there by the deadline, the avatar is still landing for a moment.)
    if (pulso.paso > last && ogroEnSuSitio && player.position.y < MESA_PULSO[1] + EN_EL_SUELO) {
      player.setGuide({ walkTo: null });
      sentarAvatar();
      playSfx('d3_ogro_grunido', { volume: 0.7 });
      setPulso({ ...pulso, fase: 'acomodo', desde: now });
    }
    return;
  }
  if (pulso.fase === 'acomodo') {
    if (elapsed < ACOMODO_MS) return;
    playSfx('d3_pulso');
    return setPulso({ ...pulso, fase: 'juego', desde: now });
  }
  if (pulso.fase === 'juego') {
    if (pulso.conGuante) {
      const cansado = Math.max(CON_GUANTE.cedeMin, 1 - elapsed / CON_GUANTE.cansancioMs);
      pulsoVivo.fuerza = Math.max(CON_GUANTE.piso, pulsoVivo.fuerza - CON_GUANTE.cede * cansado * delta);
    } else {
      pulsoVivo.fuerza -= (SIN_GUANTE.cede + (SIN_GUANTE.crece * elapsed) / 1000) * delta;
      if (pulsoVivo.fuerza <= 0) {
        pulsoVivo.fuerza = 0;
        playSfx('d3_ogro_grunido');
        setPulso({ ...pulso, fase: 'pierde', desde: now });
      }
    }
    return;
  }
  if (elapsed < FINAL_MS[pulso.fase]) return;
  if (pulso.fase === 'gana') return vencerOgro();
  perderPulso();
}

// The arm wrestling is won: the Ogre steps aside for good.
function vencerOgro() {
  terminarPulso();
  useTunelStore.getState().celebrarOgro();
  playSfx('d3_pulso_gana');
  playSfx('d3_ogro_risa', { volume: 0.8 });
  saveProgress({ ogroVencido: true });
  useUIStore.getState().openDialog(DIALOG.ogroVencido);
}

// Lost (no glove): he slams the player's arm down and throws them across the hall. It is a defeat: it costs a star.
function perderPulso() {
  terminarPulso();
  const player = usePlayerStore.getState();
  useTunelStore.getState().repelerOgro();
  playSfx('d3_ogro_lanza');
  player.takeDamage(player.maxHealth);
}
