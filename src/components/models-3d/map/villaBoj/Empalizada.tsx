import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { buildMergedLod } from '../../../../utils/mergeStaticMeshes';

// Niveles de detalle generados con `npm run lods`. La distancia se mide al centro del círculo de estacas.
const EMPALIZADA_URLS = [
  '/models-3d/map/VillaBoj/Empalizada.glb',
  '/models-3d/map/VillaBoj/Empalizada_LOD1.glb',
  '/models-3d/map/VillaBoj/Empalizada_LOD2.glb',
];
const EMPALIZADA_DISTANCES = [0, 60, 100];

export function Empalizada() {
  const gltfs = useGLTF(EMPALIZADA_URLS);
  const lod = useMemo(() => buildMergedLod(gltfs.map((gltf) => gltf.scene), EMPALIZADA_DISTANCES), [gltfs]);
  return <primitive object={lod} />;
}

useGLTF.preload(EMPALIZADA_URLS);
