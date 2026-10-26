import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { mergeStaticMeshes } from '@/game/engine/models/mergeStaticMeshes';
import { shareTerrainTextures } from '@/game/engine/models/terrainTextures';
import { MAPA_MODELS } from '@/game/world/assets';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO1_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';

const TAPAS_URL = DESAFIO1_MODELS.pantanoTristeza.tapas;

// Lids that hide the openings of the terrain over each well, painted with the terrain texture. Merged by material:
// 2 draw calls instead of 84. They share Terreno.glb's textures instead of uploading their own copy.
export function PantanoTapas() {
  const { scene } = useGLTF(TAPAS_URL);
  const { scene: terreno } = useGLTF(MAPA_MODELS.terreno);
  const merged = useMemo(() => {
    shareTerrainTextures(terreno, scene);
    return mergeStaticMeshes(scene);
  }, [scene, terreno]);
  const visible = useVisibleFrom(VISIBLE_FROM.tapas);
  return <primitive object={merged} visible={visible} />;
}

useGLTF.preload(TAPAS_URL);
