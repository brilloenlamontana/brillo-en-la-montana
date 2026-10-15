import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { buildMergedLod } from '../../../../utils/mergeStaticMeshes';

// Niveles de detalle generados con `npm run lods`. Las casas se juntan por material (9 llamadas de dibujo por nivel):
// dentro de la villa se ve el modelo completo y desde la casa de Imeri, el más simple.
const VILLA_URLS = ['/models-3d/map/VillaBoj/Villa.glb', '/models-3d/map/VillaBoj/Villa_LOD1.glb', '/models-3d/map/VillaBoj/Villa_LOD2.glb'];
const VILLA_DISTANCES = [0, 55, 95];

export function Villa() {
  const gltfs = useGLTF(VILLA_URLS);
  const lod = useMemo(() => buildMergedLod(gltfs.map((gltf) => gltf.scene), VILLA_DISTANCES), [gltfs]);
  return <primitive object={lod} />;
}

useGLTF.preload(VILLA_URLS);
