import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier';
import type { Group, SkinnedMesh } from 'three';
import { isBodyNamed, PLAYER_BODY_NAME } from '@/game/engine/physics/bodies';
import { InteractionPrompt } from './InteractionPrompt';
import { useInteractKey } from './useInteractKey';

const FADE_SECONDS = 0.25;
// Body capsule (half height, radius) with the feet at y 0.
const BODY_CAPSULE: [number, number] = [0.5, 0.35];
const BODY_CENTER: [number, number, number] = [0, 0.85, 0];
// Flat sensor on the ground in front of the NPC, in its local frame (+z is where it faces).
const TALK_SENSOR_POSITION: [number, number, number] = [0, 0.6, 1];
const TALK_SENSOR_HALF_EXTENTS: [number, number, number] = [2.5, 0.6, 2.5];
const PROMPT_HEIGHT = 2.3;

const isPlayer = (payload: IntersectionEnterPayload) => isBodyNamed(payload.other.rigidBody?.userData, PLAYER_BODY_NAME);

type NpcTalk = {
  // Completes "Presiona E para…".
  prompt: string;
  // Whether talking is possible right now.
  enabled: boolean;
  onTalk: () => void;
  // The player walked out of the talk sensor.
  onLeave?: () => void;
};

type NpcProps = {
  url: string;
  position: [number, number, number];
  rotationY: number;
  visible: boolean;
  // Standing in the world: collides and can be talked to. A mounted but absent NPC costs nothing to show later.
  present?: boolean;
  // Clip to play while visible (crossfaded when it changes); 'Idle' by default.
  animation?: string;
  talk?: NpcTalk;
};

// A character placed in the world: its GLB scene (rendered once, NPCs are unique), its idle animation, a body capsule
// and, when it has something to say, a sensor in front that shows the prompt and answers E, a tap or a click.
// While hidden its animations stop, so its skeleton costs nothing.
export function Npc({ url, position, rotationY, visible, present = true, animation = 'Idle', talk }: NpcProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);
  const [playerNearby, setPlayerNearby] = useState(false);
  const canTalk = Boolean(talk?.enabled && present && visible && playerNearby);

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
    const action = actions[animation] ?? actions.Idle;
    action?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      action?.fadeOut(FADE_SECONDS);
    };
  }, [actions, animation, visible]);

  const startTalk = useCallback(() => {
    if (canTalk) talk?.onTalk();
  }, [canTalk, talk]);
  useInteractKey(canTalk, startTalk);

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
      {present && <CapsuleCollider args={BODY_CAPSULE} position={BODY_CENTER} />}
      {present && talk && (
        <CuboidCollider
          sensor
          args={TALK_SENSOR_HALF_EXTENTS}
          position={TALK_SENSOR_POSITION}
          onIntersectionEnter={(payload) => isPlayer(payload) && setPlayerNearby(true)}
          onIntersectionExit={(payload) => {
            if (!isPlayer(payload)) return;
            setPlayerNearby(false);
            talk.onLeave?.();
          }}
        />
      )}
      <group
        ref={group}
        visible={visible}
        onClick={(event) => {
          if (!canTalk) return;
          event.stopPropagation();
          startTalk();
        }}
      >
        <primitive object={scene} />
        {canTalk && talk && (
          <Html position={[0, PROMPT_HEIGHT, 0]} center>
            <InteractionPrompt action={talk.prompt} onActivate={startTalk} />
          </Html>
        )}
      </group>
    </RigidBody>
  );
}
