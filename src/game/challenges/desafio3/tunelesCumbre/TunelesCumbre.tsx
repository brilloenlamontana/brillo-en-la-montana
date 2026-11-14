import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh } from 'three';
import { useCameraCollider } from '@/game/engine/camera/useCameraCollider';
import { StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { TUNEL_BOXES, TUNEL_CEILING_HEIGHT, TUNEL_FLOOR_NODE } from './tunelColliders';

const { estructura: ESTRUCTURA_URL, objetos: OBJETOS_URL, colision: COLISION_URL } = DESAFIO3_MODELS.tunelesCumbre;
// Module constant: a new array per render would rebuild the trimesh collider every time.
const FLOOR_NODES = [TUNEL_FLOOR_NODE] as const;

// "TunelesCumbre" collection of Map.blend: the maze of galleries inside the Summit of Desolation, from the mine mouth in
// Hedrig's town to the exit pit on the summit (true route, two loops and four dead ends; network in
// world/tunelesRed.ts). The models are only drawn; the avatar walks on a smooth floor mesh and bumps into boxes built
// from the outline of that floor (tunelColliders.ts). The camera stops at those same boxes, like at any other physics
// (PlayerController), and under a ceiling of its own that is the floor lifted.
export function TunelesCumbre() {
  const estructuraVisible = useVisibleFrom(VISIBLE_FROM.tuneles);
  const objetosVisibles = useVisibleFrom(VISIBLE_FROM.tunelesObjetos);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.tuneles);
  const { scene: colision } = useGLTF(COLISION_URL);
  const ceiling = useMemo(() => {
    colision.updateMatrixWorld(true);
    const group = new Group();
    colision.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const copy = new Mesh(mesh.geometry);
      mesh.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
      copy.position.y += TUNEL_CEILING_HEIGHT;
      group.add(copy);
    });
    group.updateMatrixWorld(true);
    return group;
  }, [colision]);
  useCameraCollider(ceiling, cameraActive);

  return (
    <group name="TunelesCumbre">
      <StaticModel url={ESTRUCTURA_URL} visible={estructuraVisible} />
      <StaticModel url={OBJETOS_URL} visible={objetosVisibles} merge />
      <TrimeshColliders scene={colision} names={FLOOR_NODES} />
      <CuboidColliders boxes={TUNEL_BOXES} />
    </group>
  );
}

useGLTF.preload([ESTRUCTURA_URL, OBJETOS_URL, COLISION_URL]);
