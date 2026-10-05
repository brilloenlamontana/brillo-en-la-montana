import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { LOD, MathUtils, Quaternion, Vector3, type Object3D } from 'three';
import { useLodScene } from '../../../../hooks/useLodScene';
import { DOOR_CLOSE_ROTATION, DOOR_HINGE_WORLD, DOOR_NODE_NAME } from './houseFrame';

const IMERI_EXTERIOR_LOD_URLS = [
  '/models-3d/map/CasaImeri/ImeriExterior.glb',
  '/models-3d/map/CasaImeri/ImeriExterior_LOD1.glb',
  '/models-3d/map/CasaImeri/ImeriExterior_LOD2.glb',
];
const IMERI_EXTERIOR_LOD_DISTANCES = [0, 40, 100];
const UP = new Vector3(0, 1, 0);
const DOOR_SPEED = 5;

// La puerta es un LOD propio dentro del grupo; girarlo sobre la bisagra la mueve en todos los niveles de detalle.
function findDoor(lodScene: Object3D) {
  return lodScene.children.find((child) => child instanceof LOD && child.levels[0]?.object.name === DOOR_NODE_NAME);
}

export function ImeriExterior({ doorOpen, ...props }: { doorOpen: boolean } & Record<string, any>) {
  const lodScene = useLodScene(IMERI_EXTERIOR_LOD_URLS, IMERI_EXTERIOR_LOD_DISTANCES);

  // El GLB trae la puerta abierta: esa es la pose de referencia, y cerrarla es girarla DOOR_CLOSE_ROTATION.
  const door = useMemo(() => {
    const object = findDoor(lodScene);
    return object ? { object, openPosition: object.position.clone(), openQuaternion: object.quaternion.clone() } : null;
  }, [lodScene]);

  const openness = useRef(doorOpen ? 1 : 0);
  const appliedOpenness = useRef<number | null>(null);
  const turn = useMemo(() => new Quaternion(), []);

  useFrame((_, delta) => {
    if (!door) return;
    openness.current = MathUtils.damp(openness.current, doorOpen ? 1 : 0, DOOR_SPEED, delta);
    if (appliedOpenness.current !== null && Math.abs(appliedOpenness.current - openness.current) < 1e-4) return;
    appliedOpenness.current = openness.current;
    turn.setFromAxisAngle(UP, (1 - openness.current) * DOOR_CLOSE_ROTATION);
    door.object.position.copy(door.openPosition).sub(DOOR_HINGE_WORLD).applyQuaternion(turn).add(DOOR_HINGE_WORLD);
    door.object.quaternion.copy(door.openQuaternion).premultiply(turn);
  });

  return (
    <primitive object={lodScene} {...props} />
  );
}

useGLTF.preload(IMERI_EXTERIOR_LOD_URLS);
