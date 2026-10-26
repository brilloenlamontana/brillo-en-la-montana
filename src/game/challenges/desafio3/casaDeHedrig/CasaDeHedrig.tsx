import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import { freeze } from '@/game/engine/models/sceneUtils';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { HEDRIG_COLLECTIBLES } from '../items';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { HEDRIG_CAMERA_BLOCKERS, HEDRIG_COLLIDERS } from './hedrigColliders';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL } = DESAFIO3_MODELS.casaDeHedrig;

// "CasaDeHedrig" collection of Map.blend: the stone house of the dwarf miner (campfire, fence, barrels outside), its
// interior and its items (glove, compass, doll), only rendered (no game logic yet). The door is part of the model.
// Collision is a handful of boxes (hedrigColliders.ts): plinth, walls with the doorway, a ramp at the door and the props.
export function CasaDeHedrig() {
  const { scene } = useGLTF(EXTERIOR_URL);
  useLayoutEffect(() => freeze(scene), [scene]);
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.puebloHedrig);
  const interiorVisible = useVisibleFrom(VISIBLE_FROM.casaHedrigInterior);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.casaHedrig);

  return (
    <group name="CasaDeHedrig">
      <primitive object={scene} visible={exteriorVisible} />
      <CuboidColliders boxes={HEDRIG_COLLIDERS} />
      <CameraColliderBoxes boxes={HEDRIG_CAMERA_BLOCKERS} active={cameraActive} />
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
