import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type BufferGeometry, type Mesh } from 'three';
import { useWorldStore } from '../store/worldStore';
import { pickLodLevel } from '../utils/lod';

const WORLD_POSITION = new Vector3();

// Cambia la geometría de una malla (también de un SkinnedMesh: los niveles conservan huesos y pesos) según su distancia
// a la cámara. geometries[i] se usa desde distances[i] metros. Mientras se calienta el renderer dibuja cada nivel una vez
// para que ninguno se suba a la GPU por primera vez en pleno juego.
export function useLodGeometry(meshRef: RefObject<Mesh | null>, geometries: BufferGeometry[], distances: readonly number[]) {
  const level = useRef(-1);
  const warmupFrame = useRef(0);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let next: number;
    if (useWorldStore.getState().warming) {
      next = warmupFrame.current++ % geometries.length;
    } else {
      mesh.getWorldPosition(WORLD_POSITION);
      next = pickLodLevel(WORLD_POSITION.distanceTo(camera.position), distances, level.current);
    }
    if (next !== level.current || mesh.geometry !== geometries[next]) {
      level.current = next;
      mesh.geometry = geometries[next];
    }
  });
}
