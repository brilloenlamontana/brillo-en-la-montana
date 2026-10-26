import { useGLTF } from '@react-three/drei';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import type { Zone } from '@/game/engine/geometry/zone';
import { Collectibles } from '@/game/engine/interaction/Collectibles';
import { usePlayerNear } from '@/game/engine/interaction/usePlayerNear';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { DESAFIO1_MODELS } from '../assets';
import { collectImeriItem } from '../backpack';
import { IMERI_COLLECTIBLES } from '../items';
import { isBackpackActive, isHouseUnlocked } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { HOUSE_POSITION, HOUSE_ROTATION } from './houseFrame';
import { HOUSE_BOXES, HOUSE_CAMERA_BOXES } from './imeriColliders';
import { ImeriExterior } from './ImeriExterior';

const INTERIOR_URL = DESAFIO1_MODELS.casaDeImeri.interior;
// Around the house: its interior is only drawn this close (and with the door unlocked).
const NEAR_HOUSE: Zone = { center: [20.01, 45.2], enterRadius: 20, exitRadius: 23 };

// "CasaDeImeri" collection of Map.blend. The door stays locked until the player accepted the villager's help (Imeri
// waits at home) and then Imeri's; after that the player pushes it open. The interior, with the items to pick up,
// is never drawn from the village or the swamp.
export function CasaDeImeri() {
  const unlocked = useProgressStore((state) => isHouseUnlocked(state.progress));
  const backpackActive = useProgressStore((state) => isBackpackActive(state.progress));
  const playerNearHouse = usePlayerNear(NEAR_HOUSE);
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.casaExterior);
  const atHouse = useVisibleFrom(VISIBLE_FROM.casaInterior);
  const warmingHere = useWarmingHere(VISIBLE_FROM.casaInterior);
  const warming = useWorldStore((state) => state.warming);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.casaImeri);
  const showInterior = warmingHere || (unlocked && playerNearHouse && atHouse);

  return (
    <group name="CasaDeImeri">
      <ImeriExterior locked={!unlocked} visible={exteriorVisible} />
      <group visible={showInterior}>
        <StaticModel url={INTERIOR_URL} merge />
        <Collectibles items={IMERI_COLLECTIBLES} active={showInterior && !warming} enabled={backpackActive} onCollect={collectImeriItem} />
      </group>
      <CuboidColliders boxes={HOUSE_BOXES} position={HOUSE_POSITION} rotation={HOUSE_ROTATION}>
        <CameraColliderBoxes boxes={HOUSE_CAMERA_BOXES} active={cameraActive} />
      </CuboidColliders>
    </group>
  );
}

useGLTF.preload(INTERIOR_URL);
