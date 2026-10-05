import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { buildLodGroup } from '../utils/buildLodGroup';

// urls[i] se muestra desde distances[i] metros de la cámara; una distancia extra al final oculta el objeto.
// Pasa urls y distances como constantes de módulo para que el grupo se construya una sola vez.
export function useLodScene(urls: string[], distances: number[]) {
  const gltfs = useGLTF(urls);
  return useMemo(
    () => buildLodGroup(distances.map((distance, i) => ({ scene: gltfs[i]?.scene ?? null, distance }))),
    [gltfs, distances],
  );
}
