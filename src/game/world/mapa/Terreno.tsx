import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { TERRAIN_BODY_NAME } from '@/game/engine/physics/bodies';
import { MAPA_MODELS } from '@/game/world/assets';
import { splitTerrain } from '@/game/engine/models/splitTerrain';
import { freeze } from '@/game/engine/models/sceneUtils';

// Terreno collection from Map.blend: a single mesh containing valleys and mountains, rendered as the visual and physical ground.
// Features openings over each swamp well and tunnel entrances. Traversable boundaries are constrained by LimiteMapa colliders.
const TERRENO_URL = MAPA_MODELS.terreno;

// Stable object reference to avoid re-applying body options on every render.
const TERRAIN_USER_DATA = { name: TERRAIN_BODY_NAME };

export function Terreno() {
  const { scene } = useGLTF(TERRENO_URL);
  useLayoutEffect(() => freeze(scene), [scene]);
  // Rendered in chunks (only camera-visible chunks are drawn); physics uses the hidden full mesh.
  const chunks = useMemo(() => splitTerrain(scene), [scene]);

  return (
    <>
      <primitive object={chunks} />
      {/* Name enables golem and zumbadores to detect the ground via useTerrainHeight. */}
      <RigidBody type="fixed" colliders="trimesh" includeInvisible userData={TERRAIN_USER_DATA}>
        <primitive object={scene} visible={false} />
      </RigidBody>
    </>
  );
}

useGLTF.preload(TERRENO_URL);
