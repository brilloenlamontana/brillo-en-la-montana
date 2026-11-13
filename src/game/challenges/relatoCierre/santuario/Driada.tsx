import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Quaternion, Vector3, type Group, type SkinnedMesh } from 'three';
import { useSalida } from '@/game/challenges/llegada';
import { createFootsteps } from '@/game/engine/audio/spatial';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { PROMPT_Z_RANGE } from '@/game/engine/interaction/promptLayer';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { playOnceAndHold } from '@/game/engine/models/animation';
import { doorPushers } from '@/game/engine/physics/doorPushers';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen } from '@/store/uiStore';
import { RELATO_CIERRE_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { isCalizTomado, isSantuarioAbierto } from '../mission';
import { LLEGADA, LLEGADA_SECONDS, SALE_ANTES } from './llegadaSantuario';
import { ALTAR_YAW, CAMINO_DRIADA, CAMINO_JUGADOR, useRitualStore } from './ritual';

const URL = RELATO_CIERRE_MODELS.driada;
const FADE_SECONDS = 0.35;
const UP = new Vector3(0, 1, 0);
// She waits on the landing before the silver willow door (floor at 52.47), looking down the avenue.
const DOOR: [number, number, number] = [151.9, 52.47, -152.2];
const DOOR_YAW = -Math.PI / 2;
// Where she meets the player: on the plaza at the foot of the steps (ground at 51.85), beside the way in.
const SPOT: [number, number, number] = [149.7, 51.86, -150.2];
const SPOT_YAW = -2.38;
// She comes out to meet whoever gets this close (m), at this pace (m/s).
const MEET_RANGE = 16;
const WALK_SPEED = 1;
// Leading the player to the altar she walks a little faster (her Caminar clip is sped up to match).
const LEAD_SPEED = 1.35;
// The player sets off for their next point when this close to the current one (m).
const PLAYER_NEXT = 0.4;
// Length of her 'Bienvenida' clip (s): played once on arriving.
const WELCOME_SECONDS = 3.4;
const TALK_RANGE = 3.4;
const BODY_CAPSULE: [number, number] = [0.5, 0.35];
const BODY_CENTER: [number, number, number] = [0, 0.85, 0];
const PROMPT_HEIGHT = 2.5;

// espera: at the door · camina: coming out to meet the player · bienvenida: welcoming bow · lista: met, at her spot.
type Phase = 'espera' | 'camina' | 'bienvenida' | 'lista';
type Clip = 'Idle' | 'Caminar' | 'Bienvenida' | 'Talking' | 'Senalar' | 'Reverencia' | 'Tocar';

// The dryad of the sanctuary. She comes out to meet the player and welcomes them; spoken to, she refuses to hand the
// chalice over until the player's answers convince her (ConversacionDriada). Then she leads the way through the doors
// to the altar and lays her right hand on the chest the chalice stands on (her 'Tocar' clip, made for where she stops:
// see ritual.ts); once the chalice shines again she bows. Her staff stays planted in her left hand throughout (it is
// part of every clip).
export function Driada({ visible }: { visible: boolean }) {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(URL);
  const { actions } = useAnimations(animations, group);
  const tomado = useProgressStore((state) => isCalizTomado(state.progress));
  const talking = useDialogOpen(DIALOG.driada);
  const fase = useRitualStore((state) => state.fase);
  // The story of the summit is ending: she comes out, however far the player still is.
  const sale = useSalida(LLEGADA.id, LLEGADA_SECONDS, SALE_ANTES);
  const saleRef = useRef(false);
  useEffect(() => {
    saleRef.current = sale;
  }, [sale]);
  // Already spoken to on an earlier visit: she is at her spot.
  const [initial] = useState<Phase>(() => (isSantuarioAbierto(useProgressStore.getState().progress) ? 'lista' : 'espera'));
  const [phase, setPhase] = useState<Phase>(initial);
  const [near, setNear] = useState(false);
  const [leading, setLeading] = useState(false);
  const live = useRef({
    phase: initial,
    near: false,
    welcomeAt: 0,
    position: new Vector3(...(initial === 'lista' ? SPOT : DOOR)),
    // Leading to the altar: points of her way reached and the player's point in turn.
    tramo: 0,
    playerPoint: -1,
    leading: false,
  });
  const work = useMemo(() => ({ step: new Vector3(), facing: new Quaternion() }), []);
  const footsteps = useMemo(() => createFootsteps('rc_driada_pasos', 0.6, 14, 0.6), []);
  const atAltar = fase === 'toque' || fase === 'hecho';
  const clip: Clip = leading
    ? 'Caminar'
    : fase === 'toque'
      ? 'Tocar'
      : phase === 'camina'
        ? 'Caminar'
        : phase === 'bienvenida'
          ? 'Bienvenida'
          : phase === 'espera'
            ? 'Idle'
            : talking
              ? 'Talking'
              : tomado
                ? 'Reverencia'
                : 'Idle';

  // A skinned mesh is posed by its skeleton, so its bounding sphere does not follow the animation: never cull it.
  useLayoutEffect(() => {
    scene.traverse((object) => {
      if ((object as SkinnedMesh).isSkinnedMesh) object.frustumCulled = false;
    });
  }, [scene]);

  useEffect(() => {
    if (!visible) {
      Object.values(actions).forEach((action) => action?.stop());
      return;
    }
    const action = actions[clip] ?? actions.Idle;
    // Her hand stays on the chest once laid there; every other clip loops.
    if (action && clip === 'Tocar') playOnceAndHold(action);
    action?.reset().fadeIn(FADE_SECONDS).play();
    action?.setEffectiveTimeScale(leading ? LEAD_SPEED / WALK_SPEED : 1);
    return () => {
      action?.fadeOut(FADE_SECONDS);
    };
  }, [actions, clip, visible, leading]);

  // While she leads the way she pushes the door leaves open, like the player does.
  useEffect(() => {
    if (fase !== 'camino') return;
    const position = live.current.position;
    doorPushers.add(position);
    return () => {
      doorPushers.delete(position);
    };
  }, [fase]);

  // Leaving in the middle of the scene (another profile, the world closes) puts it back at its start.
  useEffect(() => () => useRitualStore.getState().reiniciar(), []);

  // The player follows one step behind her: off to each point once she has reached the next one of hers.
  const leadPlayer = () => {
    const l = live.current;
    const player = usePlayerStore.getState();
    const allowed = Math.min(l.tramo - 1, CAMINO_JUGADOR.length - 1);
    const current = CAMINO_JUGADOR[l.playerPoint];
    const arrived = !current || Math.hypot(player.position.x - current[0], player.position.z - current[1]) < PLAYER_NEXT;
    if (!arrived || l.playerPoint >= allowed) return;
    l.playerPoint += 1;
    const [x, z] = CAMINO_JUGADOR[l.playerPoint];
    player.setGuide({ walkTo: { x, y: player.position.y, z } });
  };

  useFrame((_, rawDelta) => {
    if (!body.current || !group.current || !visible) return;
    const delta = Math.min(rawDelta, 0.1);
    const l = live.current;
    const player = usePlayerStore.getState().position;
    const ritual = useRitualStore.getState();
    let next = l.phase;
    let yaw = l.phase === 'espera' ? DOOR_YAW : SPOT_YAW;
    let nowLeading = false;

    if (ritual.fase === 'camino' || ritual.fase === 'toque' || ritual.fase === 'hecho') {
      // Leading the way to the altar, then standing before it.
      yaw = ALTAR_YAW;
      const point = CAMINO_DRIADA[l.tramo];
      if (ritual.fase === 'camino' && point) {
        const step = work.step.set(point[0] - l.position.x, point[1] - l.position.y, point[2] - l.position.z);
        const distance = step.length();
        const moved = Math.min(distance, LEAD_SPEED * delta);
        if (distance > 1e-3) l.position.addScaledVector(step, moved / distance);
        footsteps(moved, l.position);
        yaw = Math.atan2(step.x, step.z);
        nowLeading = true;
        if (distance - moved < 0.03) {
          l.tramo += 1;
          ritual.setTramoDriada(l.tramo);
          if (l.tramo >= CAMINO_DRIADA.length) ritual.tocar();
        }
      }
      if (ritual.fase !== 'hecho') leadPlayer();
    } else {
      l.tramo = 0;
      l.playerPoint = -1;
      if (l.phase === 'espera' && (saleRef.current || Math.hypot(player.x - SPOT[0], player.z - SPOT[2]) < MEET_RANGE)) next = 'camina';
      if (l.phase === 'camina') {
        const step = work.step.set(SPOT[0] - l.position.x, SPOT[1] - l.position.y, SPOT[2] - l.position.z);
        const distance = step.length();
        if (distance > 0.05) {
          const moved = Math.min(distance, WALK_SPEED * delta);
          l.position.addScaledVector(step, moved / distance);
          footsteps(moved, l.position);
          yaw = Math.atan2(step.x, step.z);
        } else {
          next = 'bienvenida';
          l.welcomeAt = performance.now();
        }
      }
      if (l.phase === 'bienvenida' && performance.now() - l.welcomeAt > WELCOME_SECONDS * 1000) next = 'lista';
      // Talking, she looks at the player.
      if (ritual.fase === 'conversacion') yaw = Math.atan2(player.x - l.position.x, player.z - l.position.z);
    }

    body.current.setNextKinematicTranslation(l.position);
    work.facing.setFromAxisAngle(UP, yaw);
    group.current.quaternion.slerp(work.facing, Math.min(1, 5 * delta));

    if (nowLeading !== l.leading) {
      l.leading = nowLeading;
      setLeading(nowLeading);
    }
    if (next !== l.phase) {
      l.phase = next;
      setPhase(next);
    }
    const met = (l.phase === 'bienvenida' || l.phase === 'lista') && ritual.fase === 'reposo';
    const nextNear = met && Math.abs(player.y - l.position.y) < 2.5 && Math.hypot(player.x - l.position.x, player.z - l.position.z) < TALK_RANGE;
    if (nextNear !== l.near) {
      l.near = nextNear;
      setNear(nextNear);
    }
  });

  // Once the chalice shines again there is nothing left to ask her.
  const canTalk = visible && near && !talking && !tomado && !atAltar;
  const startTalk = useCallback(() => {
    // Spoken to in the middle of her welcome: she goes straight on to talk.
    live.current.phase = 'lista';
    setPhase('lista');
    useRitualStore.getState().conversar();
  }, []);
  useInteractKey(canTalk, startTalk);

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={initial === 'lista' ? SPOT : DOOR}>
      <CapsuleCollider args={BODY_CAPSULE} position={BODY_CENTER} />
      <group ref={group} visible={visible} rotation={[0, initial === 'lista' ? SPOT_YAW : DOOR_YAW, 0]}>
        <primitive object={scene} />
      </group>
      {canTalk && (
        <Html zIndexRange={PROMPT_Z_RANGE} position={[0, PROMPT_HEIGHT, 0]} center>
          <InteractionPrompt action="hablar con la dríada" onActivate={startTalk} />
        </Html>
      )}
    </RigidBody>
  );
}

useGLTF.preload(URL);
