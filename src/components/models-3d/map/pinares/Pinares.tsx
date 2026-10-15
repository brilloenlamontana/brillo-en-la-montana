import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { Euler, Mesh, Object3D, Quaternion, Vector3, type Material } from 'three';
import { InstancedField } from '../InstancedField';

const PINARES_URL = '/models-3d/map/Pinares/Pinares.glb';
// Niveles de detalle generados con `npm run lods`.
const PINARES_LOD_URLS = [PINARES_URL, '/models-3d/map/Pinares/Pinares_LOD1.glb', '/models-3d/map/Pinares/Pinares_LOD2.glb'];
const PINARES_LOD_DISTANCES = [0, 150, 200]
// Más lejos que esto la niebla ya los borra: no se dibujan.
const PINARES_MAX_DISTANCE = 170;
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

// Los pinos se dibujan instanciados: solo los que están dentro de la vista y a menos de PINARES_MAX_DISTANCE,
// con menos detalle mientras más lejos estén.
export function Pinares() {
  const { scene } = useGLTF(PINARES_URL);
  const trunkColliders = useMemo(() => getTrunkColliders(scene), [scene]);

  return (
    <>
      <InstancedField urls={PINARES_LOD_URLS} distances={PINARES_LOD_DISTANCES} maxDistance={PINARES_MAX_DISTANCE} />
      <RigidBody type="fixed" colliders={false}>
        {trunkColliders.map(({ key, position, rotation, args }) => (
          <CuboidCollider key={key} position={position} rotation={rotation} args={args} />
        ))}
      </RigidBody>
    </>
  );
}

useGLTF.preload(PINARES_LOD_URLS);
