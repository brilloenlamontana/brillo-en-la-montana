import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Quaternion, Vector3, type Group, type Mesh } from 'three';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { usePlayerStore } from '@/game/player/playerStore';
import { isGameplayPaused, useUIStore } from '@/store/uiStore';
import { DESAFIO2_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { HADA_PEDESTAL } from './lugares';

const URL = DESAFIO2_MODELS.hada;
const FADE_SECONDS = 0.35;
const UP = new Vector3(0, 1, 0);

// Caught on the pedestal she faces the trail the player comes by.
const TRAPPED_YAW = Math.PI;
// Freed, she flutters in a slow, uneven circle over the clearing...
const ORBIT_RADIUS = 2.7;
const ORBIT_SECONDS = 9;
const ORBIT_HEIGHT = 1.5;
// ...and when the player comes this close she flies over and hovers in front of them, at chest height.
const ATTEND_RANGE = 5;
const HOVER_DISTANCE = 1.7;
const HOVER_HEIGHT = 1.15;
const FLY_SPEED = 4;
const TALK_RANGE = 3;
const PROMPT_HEIGHT = 1.15;

type HadaProps = {
  // Her clearing is drawn.
  visible: boolean;
  // Out of the bramble trap: she flies.
  liberada: boolean;
  // She can be talked to (the clearing is live and no dialog is open).
  canTalk: boolean;
};

// The fairy of the clearing (Bonus 2). Caught in the brambles she cowers on the pedestal (clip Atrapada); once the
// player cuts them she takes off and flies for good (clip Volar): circling over the clearing, bobbing, and coming to
// hover in front of the player when they get close, where she can be talked to. A small light travels with her.
export function Hada({ visible, liberada, canTalk }: HadaProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(URL);
  const { actions } = useAnimations(animations, group);
  const [near, setNear] = useState(false);
  const live = useRef({ position: new Vector3(...HADA_PEDESTAL), near: false, freedAt: null as number | null });
  const work = useMemo(() => ({ target: new Vector3(), step: new Vector3(), facing: new Quaternion() }), []);

  // A skinned mesh is posed by its skeleton, so its bounding sphere does not follow the animation: never cull it.
  useLayoutEffect(() => {
    scene.traverse((object) => {
      if ((object as Mesh).isMesh) object.frustumCulled = false;
    });
  }, [scene]);

  const clip = liberada ? 'Volar' : 'Atrapada';
  useEffect(() => {
    if (!visible) {
      Object.values(actions).forEach((action) => action?.stop());
      return;
    }
    const action = actions[clip] ?? actions.Idle;
    action?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      action?.fadeOut(FADE_SECONDS);
    };
  }, [actions, clip, visible]);

  useFrame((state, rawDelta) => {
    const hada = group.current;
    if (!hada) return;
    const delta = Math.min(rawDelta, 0.1);
    const now = state.clock.elapsedTime;
    const l = live.current;
    const p = l.position;
    let talkable = false;

    if (!liberada) {
      l.freedAt = null;
      p.set(...HADA_PEDESTAL);
      work.facing.setFromAxisAngle(UP, TRAPPED_YAW);
      hada.quaternion.copy(work.facing);
    } else if (visible) {
      l.freedAt ??= now;
      const player = usePlayerStore.getState().position;
      const toPlayer = Math.hypot(player.x - p.x, player.z - p.z);
      const attending = Math.hypot(player.x - HADA_PEDESTAL[0], player.z - HADA_PEDESTAL[2]) < ATTEND_RANGE + ORBIT_RADIUS && toPlayer < ATTEND_RANGE + 3;
      const bob = 0.14 * Math.sin(now * 2.6);
      let lookX: number, lookZ: number;
      if (attending) {
        // In front of the player, on the side she already is, looking at them.
        const away = work.step.set(p.x - player.x, 0, p.z - player.z);
        if (away.lengthSq() < 1e-4) away.set(0, 0, 1);
        away.normalize();
        work.target.set(player.x + away.x * HOVER_DISTANCE, player.y + HOVER_HEIGHT + bob, player.z + away.z * HOVER_DISTANCE);
        lookX = player.x - p.x;
        lookZ = player.z - p.z;
      } else {
        const angle = ((now - l.freedAt) / ORBIT_SECONDS) * Math.PI * 2;
        const radius = ORBIT_RADIUS + 0.7 * Math.sin(now * 0.37);
        work.target.set(
          HADA_PEDESTAL[0] + Math.cos(angle) * radius,
          HADA_PEDESTAL[1] + ORBIT_HEIGHT + 0.45 * Math.sin(now * 0.9) + bob,
          HADA_PEDESTAL[2] + Math.sin(angle) * radius,
        );
        lookX = work.target.x - p.x;
        lookZ = work.target.z - p.z;
      }
      const step = work.step.copy(work.target).sub(p);
      const distance = step.length();
      if (distance > 1e-3 && !isGameplayPaused()) p.addScaledVector(step, Math.min(distance, FLY_SPEED * delta) / distance);
      if (Math.hypot(lookX, lookZ) > 0.05) {
        work.facing.setFromAxisAngle(UP, Math.atan2(lookX, lookZ));
        hada.quaternion.slerp(work.facing, Math.min(1, 5 * delta));
      }
      talkable = canTalk && toPlayer < TALK_RANGE && Math.abs(player.y - p.y) < 3;
    }

    hada.position.copy(p);
    if (talkable !== l.near) {
      l.near = talkable;
      setNear(talkable);
    }
  });

  const talk = () => {
    // The same key press may have just picked up her amulet (which opens its own dialog).
    if (useUIStore.getState().dialog === null) useUIStore.getState().openDialog(DIALOG.hada);
  };
  useInteractKey(near, talk);

  return (
    <group ref={group} position={[...HADA_PEDESTAL]} visible={visible}>
      <primitive object={scene} />
      {/* Her light: what was seen flickering from the trail. */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#fff6b0" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial color="#ffe98a" transparent opacity={0.1} depthWrite={false} toneMapped={false} />
      </mesh>
      {near && (
        <Html position={[0, PROMPT_HEIGHT, 0]} center>
          <InteractionPrompt action="hablar con el hada" onActivate={talk} />
        </Html>
      )}
    </group>
  );
}

useGLTF.preload(URL);
