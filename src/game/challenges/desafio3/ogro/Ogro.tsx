import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Quaternion, Vector3, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { orientedBox, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { isGameplayPaused } from '@/store/uiStore';
import { DESAFIO3_MODELS } from '../assets';
import { ESCALERA_PIE, MESA_PULSO, OGRO_GUARDIA, OGRO_HALL_Y, OGRO_POSITION } from '../lugares';
import { isOgroVencido } from '../mission';
import { useTunelStore } from '../tunelStore';
import { VISIBLE_FROM } from '../visibility';
import { isAtMesaPulso, OGRO_WALK_MS, PULSO_MS, repelPlayer, retarAlOgro, vencerOgro } from './pulso';

const URL = DESAFIO3_MODELS.ogro;
const FADE_SECONDS = 0.25;
const UP = new Vector3(0, 1, 0);
// On guard he looks into the hall, at whoever comes; at his table he faces west, across it.
const GUARD_YAW = 0.1;
const TABLE_YAW = -Math.PI / 2;
const WALK_SPEED = 3.6;
const BODY_CAPSULE: [number, number] = [0.7, 0.95];
const BODY_CENTER: [number, number, number] = [0, 1.65, 0];
// Behind him, an invisible wall closes the foot of the stairs (they climb west from the hall) from wall to wall;
// getting this close to it is trying to sneak past him.
const GATE: readonly ColliderBox[] = [orientedBox('ogro-paso', [112.7, 44.6, -174.25], [0.35, 2.4, 3.8], 168.6)];
const GATE_TRIGGER = 2.6;
const REPEL_COOLDOWN_MS = 2500;
const ATTACK_MS = 2200;
const CELEBRATE_MS = 9000;
const PROMPT_POSITION: [number, number, number] = [MESA_PULSO[0], MESA_PULSO[1] + 2.2, MESA_PULSO[2]];

type OgroClip = 'Idle' | 'Attack' | 'Caminar' | 'Pulso' | 'Celebrar';

// The Ogre who guards the climb to the summit, in the hall before the exit stairs. Until he is beaten he stands right in
// front of the stairs, blocking them: whoever tries to slip by is thrown back, which hurts. Challenged at his
// arm-wrestling table he walks over to it; without the miner's glove he wins and throws the player back, with the glove
// the player wins, he celebrates, asks for something to eat from the top and stays at his table: the stairs are free.
export function Ogro() {
  const near = useVisibleFrom(VISIBLE_FROM.tunelesObjetos);
  const warming = useWarmingHere(VISIBLE_FROM.tunelesObjetos);
  const vencido = useProgressStore((state) => isOgroVencido(state.progress));

  return (
    <group name="Ogro">
      {!vencido && <CuboidColliders boxes={GATE} />}
      {(near || warming) && <OgroEnSuSala />}
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
  const live = useRef({ clip: 'Idle' as OgroClip, atTable: false, position: new Vector3(...start) });
  const work = useMemo(() => ({ step: new Vector3(), facing: new Quaternion() }), []);

  useLayoutEffect(() => prepareModel(scene), [scene]);

  useEffect(() => {
    const action = actions[clip] ?? actions.Idle;
    action?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      action?.fadeOut(FADE_SECONDS);
    };
  }, [actions, clip]);

  useFrame((_, rawDelta) => {
    if (!body.current || !group.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const now = performance.now();
    const tunel = useTunelStore.getState();
    const player = usePlayerStore.getState();
    const vencido = isOgroVencido(useProgressStore.getState().progress);
    const playing = player.health > 0 && !isGameplayPaused() && !useWorldStore.getState().warming;
    const l = live.current;

    // Where he belongs now: on guard in front of the stairs, or at his table (arm wrestling, or beaten for good).
    const atHisTable = vencido || tunel.pulsoAt !== null;
    const target = atHisTable ? OGRO_POSITION : OGRO_GUARDIA;
    const step = work.step.set(target[0] - l.position.x, target[1] - l.position.y, target[2] - l.position.z);
    const distance = step.length();
    const walking = distance > 0.08;
    if (walking) l.position.addScaledVector(step, Math.min(distance, WALK_SPEED * delta) / distance);
    body.current.setNextKinematicTranslation(l.position);
    const yaw = walking ? Math.atan2(step.x, step.z) : atHisTable ? TABLE_YAW : GUARD_YAW;
    work.facing.setFromAxisAngle(UP, yaw);
    group.current.quaternion.slerp(work.facing, Math.min(1, 8 * delta));

    if (!vencido && playing) {
      if (tunel.pulsoAt !== null) {
        if (now - tunel.pulsoAt > OGRO_WALK_MS + PULSO_MS) vencerOgro();
      } else {
        const { x, y, z } = player.position;
        const inHall = y > OGRO_HALL_Y[0] && y < OGRO_HALL_Y[1];
        const cooledDown = tunel.ogroRepelAt === null || now - tunel.ogroRepelAt > REPEL_COOLDOWN_MS;
        if (inHall && cooledDown && Math.hypot(x - ESCALERA_PIE[0], z - ESCALERA_PIE[2]) < GATE_TRIGGER) {
          repelPlayer('El ogro no deja pasar a nadie: te atrapa por una pierna y te lanza de vuelta a la sala. Demuéstrale tu fuerza en la mesa de pulso.');
        }
      }
    }

    const next: OgroClip = walking
      ? 'Caminar'
      : tunel.pulsoAt !== null
        ? 'Pulso'
        : tunel.ogroRepelAt !== null && now - tunel.ogroRepelAt < ATTACK_MS
          ? 'Attack'
          : tunel.ogroVencidoAt !== null && now - tunel.ogroVencidoAt < CELEBRATE_MS
            ? 'Celebrar'
            : 'Idle';
    if (next !== l.clip) {
      l.clip = next;
      setClip(next);
    }
    const nextAtTable = !vencido && playing && tunel.pulsoAt === null && isAtMesaPulso();
    if (nextAtTable !== l.atTable) {
      l.atTable = nextAtTable;
      setAtTable(nextAtTable);
    }
  });

  useInteractKey(atTable, retarAlOgro);

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[...start]}>
        <CapsuleCollider args={BODY_CAPSULE} position={BODY_CENTER} />
        <group ref={group}>
          <primitive object={scene} />
        </group>
      </RigidBody>
      {atTable && (
        <Html position={PROMPT_POSITION} center>
          <InteractionPrompt action="retar al ogro a un pulso" onActivate={retarAlOgro} />
        </Html>
      )}
    </>
  );
}

useGLTF.preload(URL);
