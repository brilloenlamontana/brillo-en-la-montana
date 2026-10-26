import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { freeze } from '@/game/engine/models/sceneUtils';
import { CameraBlockers, StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { HEDRIG_COLLECTIBLES } from '../items';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL } = DESAFIO3_MODELS.casaDeHedrig;
const COLLIDERS = ['HedrigParedes', 'HedrigBase', 'HedrigPuertaMarco', 'HedrigChimenea'] as const;
const CAMERA_BLOCKERS = ['HedrigParedes'] as const;

// "CasaDeHedrig" collection of Map.blend: the stone house of the dwarf miner (campfire, fence, barrels outside), its
// interior and its items (glove, compass, doll), only rendered (no game logic yet). The door is part of the model.
export function CasaDeHedrig() {
  const { scene } = useGLTF(EXTERIOR_URL);
  useLayoutEffect(() => freeze(scene), [scene]);
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.puebloHedrig);
  const interiorVisible = useVisibleFrom(VISIBLE_FROM.casaHedrigInterior);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.casaHedrig);

  return (
    <group name="CasaDeHedrig">
      <primitive object={scene} visible={exteriorVisible} />
      <TrimeshColliders scene={scene} names={COLLIDERS} />
      <CameraBlockers scene={scene} names={CAMERA_BLOCKERS} active={cameraActive} />
      <group visible={interiorVisible}>
        <StaticModel url={INTERIOR_URL} merge />
        {HEDRIG_COLLECTIBLES.map(({ id, url }) => (
          <StaticModel key={id} url={url} />
        ))}
      </group>
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, ...HEDRIG_COLLECTIBLES.map(({ url }) => url)]);
