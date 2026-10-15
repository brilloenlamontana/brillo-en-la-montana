import { useGLTF } from '@react-three/drei';
import { InstancedField } from '../InstancedField';

// Cada roca tiene ~170 triángulos: no necesita niveles de detalle, solo dejar de dibujarse lejos o fuera de la vista.
const ROCAS_URLS = ['/models-3d/map/Rocas/Rocas.glb'];
const ROCAS_DISTANCES = [0];
const ROCAS_MAX_DISTANCE = 130;

export function Rocas() {
  return <InstancedField urls={ROCAS_URLS} distances={ROCAS_DISTANCES} maxDistance={ROCAS_MAX_DISTANCE} />;
}

useGLTF.preload(ROCAS_URLS);
