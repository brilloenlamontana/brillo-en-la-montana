import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { MathUtils, Quaternion, Vector3, type AnimationAction, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { createFootsteps } from '@/game/engine/audio/spatial';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { PROMPT_Z_RANGE } from '@/game/engine/interaction/promptLayer';
import { playOnceAndHold } from '@/game/engine/models/animation';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { orientedBox, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { isGameplayPaused } from '@/store/uiStore';
import { DESAFIO3_MODELS } from '../assets';
import { ESCALERA_PIE, MESA_PULSO, OGRO_GUARDIA, OGRO_HALL_Y, OGRO_POSITION, OGRO_PULSO } from '../lugares';
import { isOgroVencido } from '../mission';
import { useTunelStore } from '../tunelStore';
import { VISIBLE_FROM } from '../visibility';
import { avanzarPulso, bancoDelPulso, desafiarAlOgro, golpeDelOgro, impactoDelOgro, inclinacionPulso, isAtMesaPulso, seguirManoDelOgro, terminarPulso } from './pulso';
import { PulsoCamara } from './PulsoCamara';

const URL = DESAFIO3_MODELS.ogro;
const FADE_SECONDS = 0.25;
const UP = new Vector3(0, 1, 0);
// On guard he looks into the hall, at whoever comes; at his table he faces west, across it.
const GUARD_YAW = 0.1;
const TABLE_YAW = -Math.PI / 2;
const WALK_SPEED = 3.6;
// He stands 2.1 m tall, a little more than the tallest character.
const BODY_CAPSULE: [number, number] = [0.5, 0.6];
const BODY_CENTER: [number, number, number] = [0, 1.1, 0];
// Behind him, an invisible wall closes the foot of the stairs (they climb west from the hall) from wall to wall;
// getting this close to it is trying to sneak past him.
const GATE: readonly ColliderBox[] = [orientedBox('ogro-paso', [112.7, 44.6, -174.25], [0.35, 2.4, 3.8], 168.6)];
const GATE_TRIGGER = 2.6;
const REPEL_COOLDOWN_MS = 2500;
const ATTACK_MS = 2200;
// His mace lands this long into the swing, on whoever is still within its reach (m).
const IMPACT_MS = 850;
const MACE_REACH = 2.4;
const CELEBRATE_MS = 9000;
const PROMPT_POSITION: [number, number, number] = [MESA_PULSO[0], MESA_PULSO[1] + 2.0, MESA_PULSO[2]];

// How fast his arm follows the strength of the wrestling (1/s), and the wood of the bench of a short challenger.
const ARM_FOLLOW = 9;
const BANCO_SIZE: [number, number] = [0.45, 0.95];
// The bench stands a little behind the avatar's feet: the rock of the table is right in front of them.
const BANCO_ATRAS = 0.1;
const BANCO_COLOR = '#6b4a2b';

// 'Pulso' is not one clip but three, mixed by how the wrestling goes: level, winning and losing.
type OgroClip = 'Idle' | 'Attack' | 'Caminar' | 'PulsoAcomodo' | 'Pulso' | 'Celebrar';
const PULSO_CLIPS = ['PulsoMedio', 'PulsoGana', 'PulsoPierde'] as const;

// The Ogre who guards the climb to the summit, in the hall before the exit stairs. Until he is beaten he stands right in
// front of the stairs, blocking them: whoever tries to slip by gets a blow of his, which hurts. Challenged at his
// arm-wrestling table he walks over, leans on it and plants his right elbow on it (the left hand holds his mace), and the
// two wrestle (see pulso.ts) with the camera at their side: without the miner's glove he wins and throws the player
// across the hall, with the glove the player wins, he celebrates and stays at his table: the stairs are free.
export function Ogro() {
  const near = useVisibleFrom(VISIBLE_FROM.tunelesObjetos);
  const warming = useWarmingHere(VISIBLE_FROM.tunelesObjetos);
  const vencido = useProgressStore((state) => isOgroVencido(state.progress));

  return (
    <group name="Ogro">
      {!vencido && <CuboidColliders boxes={GATE} />}
      {(near || warming) && <OgroEnSuSala />}
      <PulsoCamara />
    </group>
  );
}

// A skinned mesh is posed by its skeleton, so its bounding sphere does not follow the animation: never cull it. His
// material comes fully metallic from its source file, which renders black without an environment map: made matte.
function prepareModel(scene: Object3D) {
  scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const material = mesh.material as MeshStandardMaterial;
    material.metalness = 0;
    material.roughness = 0.85;
  });
}

function OgroEnSuSala() {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(URL);
  const { actions } = useAnimations(animations, group);
  const [clip, setClip] = useState<OgroClip>('Idle');
  const [atTable, setAtTable] = useState(false);
  // Beaten before this visit: he is already at his table.
  const [start] = useState(() => (isOgroVencido(useProgressStore.getState().progress) ? OGRO_POSITION : OGRO_GUARDIA));
  const live = useRef({ clip: 'Idle' as OgroClip, atTable: false, position: new Vector3(...start), lean: 0, swinging: false });
  const work = useMemo(() => ({ step: new Vector3(), facing: new Quaternion(), wrist: new Vector3(), knuckles: new Vector3() }), []);
  // His model is mirrored (the mace in his left hand): the bones named 'Left' are those of the right arm he wrestles with.
  const fist = useMemo(() => ({ wrist: scene.getObjectByName('mixamorigLeftHand'), knuckles: scene.getObjectByName('mixamorigLeftHandMiddle1') }), [scene]);
  // The bench of a short challenger shows once both have settled.
  const seated = useTunelStore((state) => state.pulso !== null && state.pulso.fase !== 'camino');
  const banco = seated ? bancoDelPulso() : null;
  const footsteps = useMemo(() => createFootsteps('d3_ogro_pasos', 0.95, 24), []);

  useLayoutEffect(() => prepareModel(scene), [scene]);

  useEffect(() => {
    // The three clips of the wrestling play together; useFrame sets how much of each shows.
    const playing: (AnimationAction | null | undefined)[] = clip === 'Pulso' ? PULSO_CLIPS.map((name) => actions[name]) : [actions[clip] ?? actions.Idle];
    if (clip === 'PulsoAcomodo' && playing[0]) playOnceAndHold(playing[0]);
    playing.forEach((action, i) => action?.reset().setEffectiveWeight(clip === 'Pulso' && i > 0 ? 0 : 1).fadeIn(FADE_SECONDS).play());
    return () => playing.forEach((action) => action?.fadeOut(FADE_SECONDS));
  }, [actions, clip]);

  // Leaving in the middle of the arm wrestling (the hall is left behind, the world closes) ends it.
  useEffect(() => terminarPulso, []);

  useFrame((_, rawDelta) => {
    if (!body.current || !group.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const now = performance.now();
    const tunel = useTunelStore.getState();
    const player = usePlayerStore.getState();
    const vencido = isOgroVencido(useProgressStore.getState().progress);
    const playing = player.health > 0 && !isGameplayPaused() && !useWorldStore.getState().warming;
    const l = live.current;

    // Where he belongs now: on guard in front of the stairs, crouched at his table for the arm wrestling, or by it
    // (beaten for good).
    const atHisTable = vencido || tunel.pulso !== null;
    const target = tunel.pulso ? OGRO_PULSO : vencido ? OGRO_POSITION : OGRO_GUARDIA;
    const step = work.step.set(target[0] - l.position.x, target[1] - l.position.y, target[2] - l.position.z);
    const distance = step.length();
    const walking = distance > 0.08;
    if (walking) {
      const moved = Math.min(distance, WALK_SPEED * delta);
      l.position.addScaledVector(step, moved / distance);
      footsteps(moved, l.position);
    }
    body.current.setNextKinematicTranslation(l.position);
    // On guard he turns to whoever he is hitting.
    const hitting = tunel.ogroRepelAt !== null && now - tunel.ogroRepelAt < ATTACK_MS;
    const yaw = walking
      ? Math.atan2(step.x, step.z)
      : atHisTable
        ? TABLE_YAW
        : hitting
          ? Math.atan2(player.position.x - l.position.x, player.position.z - l.position.z)
          : GUARD_YAW;
    work.facing.setFromAxisAngle(UP, yaw);
    group.current.quaternion.slerp(work.facing, Math.min(1, 8 * delta));

    // Defeated in the middle of the arm wrestling (the spectre caught up): it is over.
    if (tunel.pulso !== null && player.health <= 0) terminarPulso();
    else if (!vencido && playing) {
      if (tunel.pulso !== null) {
        l.swinging = false;
        avanzarPulso(now, delta, !walking);
      } else {
        const { x, y, z } = player.position;
        const inHall = y > OGRO_HALL_Y[0] && y < OGRO_HALL_Y[1];
        const cooledDown = tunel.ogroRepelAt === null || now - tunel.ogroRepelAt > REPEL_COOLDOWN_MS;
        // (Not whoever is by his table: that is where he is challenged.)
        if (inHall && cooledDown && !isAtMesaPulso() && Math.hypot(x - ESCALERA_PIE[0], z - ESCALERA_PIE[2]) < GATE_TRIGGER) {
          golpeDelOgro();
          l.swinging = true;
        } else if (l.swinging && tunel.ogroRepelAt !== null && now - tunel.ogroRepelAt >= IMPACT_MS) {
          // (`tunel` was read before this frame's swing could start: a swing never lands in its first frame.)
          l.swinging = false;
          if (inHall && Math.hypot(x - l.position.x, z - l.position.z) < MACE_REACH) impactoDelOgro();
        }
      }
    }

    // The arm wrestling may have moved on, or ended, just now.
    const pulso = useTunelStore.getState().pulso;
    if (pulso && pulso.fase !== 'camino') {
      // His arm follows the strength of the wrestling, and the avatar's hand follows his knuckles.
      l.lean = MathUtils.damp(l.lean, inclinacionPulso(pulso), ARM_FOLLOW, delta);
      actions.PulsoMedio?.setEffectiveWeight(1 - Math.abs(l.lean));
      actions.PulsoGana?.setEffectiveWeight(Math.max(0, l.lean));
      actions.PulsoPierde?.setEffectiveWeight(Math.max(0, -l.lean));
      if (fist.wrist && fist.knuckles) seguirManoDelOgro(fist.wrist.getWorldPosition(work.wrist), fist.knuckles.getWorldPosition(work.knuckles), pulso, now);
    } else l.lean = 0;

    const next: OgroClip = walking
      ? 'Caminar'
      : pulso
        ? pulso.fase === 'camino'
          ? 'Idle'
          : pulso.fase === 'acomodo'
            ? 'PulsoAcomodo'
            : 'Pulso'
        : tunel.ogroRepelAt !== null && now - tunel.ogroRepelAt < ATTACK_MS
          ? 'Attack'
          : tunel.ogroVencidoAt !== null && now - tunel.ogroVencidoAt < CELEBRATE_MS
            ? 'Celebrar'
            : 'Idle';
    if (next !== l.clip) {
      l.clip = next;
      setClip(next);
    }
    const nextAtTable = !vencido && playing && pulso === null && isAtMesaPulso();
    if (nextAtTable !== l.atTable) {
      l.atTable = nextAtTable;
      setAtTable(nextAtTable);
    }
  });

  useInteractKey(atTable, desafiarAlOgro);

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[...start]}>
        <CapsuleCollider args={BODY_CAPSULE} position={BODY_CENTER} />
        <group ref={group}>
          <primitive object={scene} />
        </group>
      </RigidBody>
      {banco && (
        <mesh position={[banco.feet.x - BANCO_ATRAS, banco.feet.y - banco.alto / 2, banco.feet.z]}>
          <boxGeometry args={[BANCO_SIZE[0], banco.alto, BANCO_SIZE[1]]} />
          <meshStandardMaterial color={BANCO_COLOR} roughness={0.9} />
        </mesh>
      )}
      {atTable && (
        <Html zIndexRange={PROMPT_Z_RANGE} position={PROMPT_POSITION} center>
          <InteractionPrompt action="retar al ogro a un pulso" onActivate={desafiarAlOgro} />
        </Html>
      )}
    </>
  );
}

useGLTF.preload(URL);
