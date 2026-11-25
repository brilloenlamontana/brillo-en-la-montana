import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { TERRAIN_BODY_NAME } from '@/game/engine/physics/bodies';
import { MAPA_MODELS } from '@/game/world/assets';
import { splitTerrain } from '@/game/engine/models/splitTerrain';
import { walkableTerrain } from '@/game/engine/models/walkableTerrain';
import { freeze } from '@/game/engine/models/sceneUtils';
import { registerTerrainMaterials } from '@/game/engine/models/terrainTextures';

// Terreno collection from Map.blend: a single mesh containing valleys and mountains, rendered as the visual and physical ground.
// It is drawn whole, also over each swamp well, but its physics has an opening over each well (walkableTerrain) and at
// the tunnel entrances. Traversable boundaries are constrained by LimiteMapa colliders.
const TERRENO_URL = MAPA_MODELS.terreno;

// Stable object reference to avoid re-applying body options on every render.
const TERRAIN_USER_DATA = { name: TERRAIN_BODY_NAME };

export function Terreno() {
  const { scene } = useGLTF(TERRENO_URL);
  useLayoutEffect(() => freeze(scene), [scene]);
  // Its colour texture is swapped for the green one when the world recovers (MundoRecuperado).
  useLayoutEffect(() => registerTerrainMaterials(scene), [scene]);
  // Rendered in chunks (only camera-visible chunks are drawn); physics uses one hidden mesh without the well covers.
  const chunks = useMemo(() => splitTerrain(scene), [scene]);
  const ground = useMemo(() => walkableTerrain(scene), [scene]);

  return (
    <>
      <primitive object={chunks} />
      {/* Name enables golem and zumbadores to detect the ground via useTerrainHeight. */}
      <RigidBody type="fixed" colliders="trimesh" includeInvisible userData={TERRAIN_USER_DATA}>
        <primitive object={ground} visible={false} />
      </RigidBody>
    </>
  );
}

useGLTF.preload(TERRENO_URL);
