import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import { Collectibles } from '@/game/engine/interaction/Collectibles';
import { freeze } from '@/game/engine/models/sceneUtils';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { DESAFIO3_MODELS } from '../assets';
import { collectHedrigItem } from '../backpack';
import { HEDRIG_COLLECTIBLES } from '../items';
import { isHedrigHouseUnlocked } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { HEDRIG_CAMERA_BLOCKERS, HEDRIG_COLLIDERS } from './hedrigColliders';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL } = DESAFIO3_MODELS.casaDeHedrig;
// Door leaf, with its origin on the hinge.
const DOOR = 'HedrigPuerta';

// "CasaDeHedrig" collection of Map.blend: the stone house of the dwarf miner (campfire, fence, barrels outside), its
// interior and her items. The door stays locked until Hedrig's help is accepted; then the player pushes it open and
// the glove, the compass and the doll can be picked up. Collision is a handful of boxes (hedrigColliders.ts) plus
// the door leaf.
export function CasaDeHedrig() {
  const { scene, nodes } = useGLTF(EXTERIOR_URL);
  useLayoutEffect(() => freeze(scene), [scene]);
  const unlocked = useProgressStore((state) => isHedrigHouseUnlocked(state.progress));
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.puebloHedrig);
  const interiorVisible = useVisibleFrom(VISIBLE_FROM.casaHedrigInterior);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.casaHedrig);
  const warming = useWorldStore((state) => state.warming);
  const door = nodes[DOOR];

  return (
    <group name="CasaDeHedrig">
      <primitive object={scene} visible={exteriorVisible} />
      {door && <PhysicsDoor node={door} locked={!unlocked} />}
      <CuboidColliders boxes={HEDRIG_COLLIDERS} />
      <CameraColliderBoxes boxes={HEDRIG_CAMERA_BLOCKERS} active={cameraActive} />
      <group visible={interiorVisible}>
        <StaticModel url={INTERIOR_URL} merge />
        <Collectibles items={HEDRIG_COLLECTIBLES} active={interiorVisible && !warming} enabled={unlocked} onCollect={collectHedrigItem} />
      </group>
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, ...HEDRIG_COLLECTIBLES.map(({ url }) => url)]);
