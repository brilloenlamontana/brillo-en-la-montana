import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import type { Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
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
import { ESCALERA_PIE, MESA_PULSO, OGRO_HALL_Y, OGRO_POSITION } from '../lugares';
import { isOgroVencido } from '../mission';
import { useTunelStore } from '../tunelStore';
import { VISIBLE_FROM } from '../visibility';
import { isAtMesaPulso, PULSO_MS, repelPlayer, retarAlOgro, vencerOgro } from './pulso';

const URL = DESAFIO3_MODELS.ogro;
const FADE_SECONDS = 0.25;
// He faces west, toward the table and whoever comes in.
const ROTATION_Y = -Math.PI / 2;
const BODY_CAPSULE: [number, number] = [0.7, 0.95];
const BODY_CENTER: [number, number, number] = [0, 1.65, 0];
// While he guards the way, an invisible wall closes the foot of the stairs (they climb west from the hall); getting
// this close to it is trying to sneak past him.
const GATE: readonly ColliderBox[] = [orientedBox('ogro-paso', [112.7, 44.6, -174.25], [0.35, 2.4, 3.8], 168.6)];
const GATE_TRIGGER = 2.6;
const REPEL_COOLDOWN_MS = 2500;
const ATTACK_MS = 2200;
const CELEBRATE_MS = 9000;
const PROMPT_POSITION: [number, number, number] = [MESA_PULSO[0], MESA_PULSO[1] + 2.2, MESA_PULSO[2]];

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

type OgroClip = 'Idle' | 'Attack' | 'Pulso' | 'Celebrar';

// The Ogre who guards the climb to the summit, in the hall before the exit stairs. Nobody passes until he is beaten at
// arm wrestling on his table: without the miner's glove (or trying to slip by) he throws the player back, which hurts;
// with the glove the player wins, he celebrates, asks for something to eat from the top and clears the way for good.
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

function OgroEnSuSala() {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(URL);
  const { actions } = useAnimations(animations, group);
  const [clip, setClip] = useState<OgroClip>('Idle');
  const [atTable, setAtTable] = useState(false);
  const live = useRef({ clip: 'Idle' as OgroClip, atTable: false });

  useLayoutEffect(() => prepareModel(scene), [scene]);

  useEffect(() => {
    const action = actions[clip] ?? actions.Idle;
    action?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      action?.fadeOut(FADE_SECONDS);
    };
  }, [actions, clip]);

  useFrame(() => {
    const now = performance.now();
    const tunel = useTunelStore.getState();
    const player = usePlayerStore.getState();
    const vencido = isOgroVencido(useProgressStore.getState().progress);
    const playing = player.health > 0 && !isGameplayPaused() && !useWorldStore.getState().warming;

    if (!vencido && playing) {
      if (tunel.pulsoAt !== null) {
        if (now - tunel.pulsoAt > PULSO_MS) vencerOgro();
      } else {
        const { x, y, z } = player.position;
        const inHall = y > OGRO_HALL_Y[0] && y < OGRO_HALL_Y[1];
        const cooledDown = tunel.ogroRepelAt === null || now - tunel.ogroRepelAt > REPEL_COOLDOWN_MS;
        if (inHall && cooledDown && Math.hypot(x - ESCALERA_PIE[0], z - ESCALERA_PIE[2]) < GATE_TRIGGER) {
          repelPlayer('El ogro no deja pasar a nadie: te atrapa por una pierna y te lanza de vuelta a la sala. Demuéstrale tu fuerza en la mesa de pulso.');
        }
      }
    }

    const next: OgroClip =
      tunel.pulsoAt !== null
        ? 'Pulso'
        : tunel.ogroRepelAt !== null && now - tunel.ogroRepelAt < ATTACK_MS
          ? 'Attack'
          : tunel.ogroVencidoAt !== null && now - tunel.ogroVencidoAt < CELEBRATE_MS
            ? 'Celebrar'
            : 'Idle';
    if (next !== live.current.clip) {
      live.current.clip = next;
      setClip(next);
    }
    const nextAtTable = !vencido && playing && tunel.pulsoAt === null && isAtMesaPulso();
    if (nextAtTable !== live.current.atTable) {
      live.current.atTable = nextAtTable;
      setAtTable(nextAtTable);
    }
  });

  useInteractKey(atTable, retarAlOgro);

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[...OGRO_POSITION]} rotation={[0, ROTATION_Y, 0]}>
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
