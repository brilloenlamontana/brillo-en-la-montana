import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Euler, Mesh, Object3D, Quaternion, Vector3, type Material } from 'three';

const PINARES_URL = '/models-3d/map/Pinares/Pinares.glb';
const TRUNK_MATERIAL = 'PinoCorteza';

type TrunkCollider = {
  key: string;
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number, number];
};

// Un cuboide por pino con el tamaño del tronco, leído del GLB para seguir posición, rotación y escala de cada árbol.
function getTrunkColliders(scene: Object3D): TrunkCollider[] {
  scene.updateMatrixWorld(true);
  const colliders: TrunkCollider[] = [];
  for (const pine of scene.children) {
    const trunk = pine.children.find(
      (child): child is Mesh => (child as Mesh).isMesh === true && ((child as Mesh).material as Material).name === TRUNK_MATERIAL,
    );
    if (!trunk) continue;
    if (!trunk.geometry.boundingBox) trunk.geometry.computeBoundingBox();
    const box = trunk.geometry.boundingBox!;
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    trunk.matrixWorld.decompose(position, quaternion, scale);
    const center = box.getCenter(new Vector3()).applyMatrix4(trunk.matrixWorld);
    const half = box.getSize(new Vector3()).multiply(scale).multiplyScalar(0.5);
    const rotation = new Euler().setFromQuaternion(quaternion);
    colliders.push({
      key: pine.name,
      position: [center.x, center.y, center.z],
      rotation: [rotation.x, rotation.y, rotation.z],
      args: [half.x, half.y, half.z],
    });
  }
  return colliders;
}

export function Pinares(props: any) {
  const { scene } = useGLTF(PINARES_URL);
  const trunkColliders = useMemo(() => getTrunkColliders(scene), [scene]);

  return (
    <>
      <primitive object={scene} {...props} />
      <RigidBody type="fixed" colliders={false}>
        {trunkColliders.map(({ key, position, rotation, args }) => (
          <CuboidCollider key={key} position={position} rotation={rotation} args={args} />
        ))}
      </RigidBody>
    </>
  );
}

useGLTF.preload(PINARES_URL);
