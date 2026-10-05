import { useCallback } from 'react';
import { useRapier, type RapierCollider } from '@react-three/rapier';
import { isBodyNamed, TERRAIN_BODY_NAME } from '../constants/bodies';

const DOWN = { x: 0, y: -1, z: 0 };

const isTerrain = (collider: RapierCollider) => isBodyNamed(collider.parent()?.userData, TERRAIN_BODY_NAME);

// Altura del terreno bajo (x, z) con un rayo de Rapier que solo ve el trimesh del terreno.
// Devuelve null sobre los huecos de los pozos, así quien camina puede mantener su altura.
export function useTerrainHeight() {
  const { world, rapier } = useRapier();

  return useCallback(
    (x: number, z: number, fromY: number, maxDrop: number): number | null => {
      const ray = new rapier.Ray({ x, y: fromY, z }, DOWN);
      const hit = world.castRay(ray, maxDrop, true, undefined, undefined, undefined, undefined, isTerrain);
      return hit ? fromY - hit.timeOfImpact : null;
    },
    [world, rapier],
  );
}
