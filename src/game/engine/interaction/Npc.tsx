import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, CuboidCollider, RigidBody, type IntersectionEnterPayload, type RapierRigidBody } from '@react-three/rapier';
import { MathUtils, Quaternion, Vector3, type Group, type Object3D, type SkinnedMesh } from 'three';
import { isBodyNamed, PLAYER_BODY_NAME } from '@/game/engine/physics/bodies';
import { InteractionPrompt } from './InteractionPrompt';
import { PROMPT_Z_RANGE } from './promptLayer';
import { useInteractKey } from './useInteractKey';

const FADE_SECONDS = 0.25;
// Body capsule (half height, radius) with the feet at y 0.
const BODY_CAPSULE: [number, number] = [0.5, 0.35];
const BODY_CENTER: [number, number, number] = [0, 0.85, 0];
// Flat sensor on the ground in front of the NPC, in its local frame (+z is where it faces).
const TALK_SENSOR_POSITION: [number, number, number] = [0, 0.6, 1];
const TALK_SENSOR_HALF_EXTENTS: [number, number, number] = [2.5, 0.6, 2.5];
const PROMPT_HEIGHT = 2.3;

// Walking (see NpcEntrance and NpcGait): how far each thigh swings and each knee bends (rad), how fast the gait fades
// in and out and how fast the character turns to where it goes (1/s).
const THIGH_SWING = 0.48;
const KNEE_BEND = 0.75;
const GAIT_FADE = 6;
const TURN_SPEED = 7;
const UP = new Vector3(0, 1, 0);

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

type Point3 = readonly [number, number, number];

// A character that comes out of somewhere (a house) and walks to its place. `path`: where it appears and the stops on
// the way (world points); its place (`position`) is the last stop. `state`: 'inside' it is not out yet (not drawn),
// 'go' it sets off now, 'out' it stands at its place. Once it sets off it walks to the end whatever `state` says.
export type NpcEntrance = { path: readonly Point3[]; speed: number; state: 'inside' | 'go' | 'out'; onArrive?: () => void };

// The leg bones of its skeleton (names as three.js keeps them), left and right, for the walk: no clip is needed, the
// legs swing on top of whatever clip plays. `stride`: metres walked per cycle of the two legs.
export type NpcGait = { thighs: readonly [string, string]; shins: readonly [string, string]; stride: number };

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
  entrance?: NpcEntrance;
  gait?: NpcGait;
};

// Turns `bone` by a rotation given in world space (the clip has just posed it).
const turn = { world: new Quaternion(), parent: new Quaternion(), by: new Quaternion() };
function turnInWorld(bone: Object3D, axis: Vector3, angle: number) {
  bone.getWorldQuaternion(turn.world).premultiply(turn.by.setFromAxisAngle(axis, angle));
  bone.parent!.getWorldQuaternion(turn.parent).invert();
  bone.quaternion.copy(turn.parent.multiply(turn.world));
  bone.updateMatrixWorld(true);
}

// A character placed in the world: its GLB scene (rendered once, NPCs are unique), its idle animation, a body capsule
// and, when it has something to say, a sensor in front that shows the prompt and answers E, a tap or a click.
// While hidden its animations stop, so its skeleton costs nothing. With an `entrance` it comes out of its house and
// walks to its place (legs moved by `gait`); only then can it be bumped into or spoken to.
export function Npc({ url, position, rotationY, visible, present = true, animation = 'Idle', talk, entrance, gait }: NpcProps) {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);
  const [playerNearby, setPlayerNearby] = useState(false);
  // Coming out of its house: 'inside' until it sets off, 'walking' on its way, 'out' at its place.
  const [stage, setStage] = useState<'inside' | 'walking' | 'out'>(() => (entrance && entrance.state !== 'out' ? 'inside' : 'out'));
  const walk = useRef({ stage, stop: 0, at: new Vector3(...position), phase: 0, amount: 0, yaw: 0 });
  const legs = useMemo(() => {
    if (!gait) return null;
    const find = (name: string) => scene.getObjectByName(name);
    const bones = [find(gait.thighs[0]), find(gait.thighs[1]), find(gait.shins[0]), find(gait.shins[1])];
    if (bones.some((bone) => !bone)) return null;
    // What each bone was before the last swing and what the swing left: a bone its clip does not move is put back.
    return (bones as Object3D[]).map((bone) => ({ bone, base: bone.quaternion.clone(), written: bone.quaternion.clone() }));
  }, [scene, gait]);
  const work = useMemo(() => ({ step: new Vector3(), side: new Vector3() }), []);
  const out = stage === 'out';
  const here = present && out;
  const shown = visible && stage !== 'inside';
  const canTalk = Boolean(talk?.enabled && here && visible && playerNearby);

  // Whoever is already out when the story says so (spoken to on an earlier visit) stands at its place.
  useEffect(() => {
    if (!entrance || entrance.state !== 'out' || walk.current.stage !== 'inside') return;
    walk.current.stage = 'out';
    setStage('out');
  }, [entrance]);

  useFrame((_, rawDelta) => {
    const w = walk.current;
    const delta = Math.min(rawDelta, 0.1);
    if (entrance && w.stage === 'inside' && entrance.state === 'go' && visible) {
      w.stage = 'walking';
      w.stop = 1;
      w.at.set(...(entrance.path[0] ?? position));
      setStage('walking');
    }
    const walking = w.stage === 'walking' && entrance !== undefined;
    if (walking) {
      const stops = entrance.path;
      const target = stops[w.stop] ?? position;
      const step = work.step.set(target[0] - w.at.x, target[1] - w.at.y, target[2] - w.at.z);
      const distance = step.length();
      const moved = Math.min(distance, entrance.speed * delta);
      if (distance > 1e-4) w.at.addScaledVector(step, moved / distance);
      if (Math.hypot(step.x, step.z) > 0.02) w.yaw = Math.atan2(step.x, step.z) - rotationY;
      if (gait) w.phase += (moved / gait.stride) * Math.PI * 2;
      if (distance - moved < 0.03) {
        if (w.stop < stops.length) w.stop += 1;
        else {
          w.stage = 'out';
          w.yaw = 0;
          setStage('out');
          entrance.onArrive?.();
        }
      }
      body.current?.setNextKinematicTranslation(w.at);
    }
    if (group.current && (walking || Math.abs(group.current.rotation.y) > 1e-3)) {
      // The shortest way round to where it faces.
      const turnBy = MathUtils.euclideanModulo(w.yaw - group.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      group.current.rotation.y += turnBy * Math.min(1, TURN_SPEED * delta);
    }

    // The legs: each thigh swings and its knee bends while the leg comes forward, on top of the clip.
    w.amount = MathUtils.damp(w.amount, walking ? 1 : 0, GAIT_FADE, delta);
    if (!legs || !group.current || !shown) return;
    for (const leg of legs) {
      if (leg.bone.quaternion.equals(leg.written)) leg.bone.quaternion.copy(leg.base);
      leg.base.copy(leg.bone.quaternion);
    }
    if (w.amount > 0.005) {
      group.current.updateMatrixWorld(true);
      const side = work.side.set(1, 0, 0).applyAxisAngle(UP, rotationY + group.current.rotation.y);
      for (let i = 0; i < 2; i++) {
        const phase = w.phase + i * Math.PI;
        turnInWorld(legs[i].bone, side, -THIGH_SWING * Math.sin(phase) * w.amount);
        turnInWorld(legs[i + 2].bone, side, KNEE_BEND * Math.max(0, Math.cos(phase)) * w.amount);
      }
    }
    for (const leg of legs) leg.written.copy(leg.bone.quaternion);
  });

  // A skinned mesh is posed by its skeleton, so its bounding sphere does not follow the animation: never cull it.
  useLayoutEffect(() => {
    scene.traverse((object) => {
      if ((object as SkinnedMesh).isSkinnedMesh) object.frustumCulled = false;
    });
  }, [scene]);

  useEffect(() => {
    if (!shown) {
      Object.values(actions).forEach((action) => action?.stop());
      return;
    }
    const action = actions[animation] ?? actions.Idle;
    action?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      action?.fadeOut(FADE_SECONDS);
    };
  }, [actions, animation, shown]);

  const startTalk = useCallback(() => {
    if (canTalk) talk?.onTalk();
  }, [canTalk, talk]);
  useInteractKey(canTalk, startTalk);

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={position} rotation={[0, rotationY, 0]}>
      {here && <CapsuleCollider args={BODY_CAPSULE} position={BODY_CENTER} />}
      {here && talk && (
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
        visible={shown}
        onClick={(event) => {
          if (!canTalk) return;
          event.stopPropagation();
          startTalk();
        }}
      >
        <primitive object={scene} />
        {canTalk && talk && (
          <Html zIndexRange={PROMPT_Z_RANGE} position={[0, PROMPT_HEIGHT, 0]} center>
            <InteractionPrompt action={talk.prompt} onActivate={startTalk} />
          </Html>
        )}
      </group>
    </RigidBody>
  );
}
