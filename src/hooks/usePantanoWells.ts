import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { getPantanoWells, PANTANO_POZOS_URL, type Well } from '../utils/wells';

export function usePantanoWells(): Well[] {
  const { scene } = useGLTF(PANTANO_POZOS_URL);
  return useMemo(() => getPantanoWells(scene), [scene]);
}
