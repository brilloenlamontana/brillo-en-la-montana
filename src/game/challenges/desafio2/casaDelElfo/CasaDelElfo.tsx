import { useGLTF } from '@react-three/drei';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import { Collectibles } from '@/game/engine/interaction/Collectibles';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { DESAFIO2_MODELS } from '../assets';
import { collectElfoItem } from '../backpack';
import { ELFO_COLLECTIBLES } from '../items';
import { isElfoHouseUnlocked } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { ELFO_CAMERA_BOXES, ELFO_COLLIDER_BOXES } from './elfoColliders';
import { ElfoExterior } from './ElfoExterior';

const { interior: INTERIOR_URL, arbolGigante: ARBOL_URL } = DESAFIO2_MODELS.casaDelElfo;

// "CasaDelElfo" collection of Map.blend: the giant tree, the house in its crown and, inside, the elf's tools. The
// door stays locked until the elf's help is accepted; then the sword, lens and map can be picked up. Collision is the
// minimal cuboids of elfoColliders.ts (stairs, deck, railing, walls, furniture, trunk) plus the door; walls, lintel
// and ceiling also keep the camera inside the house.
export function CasaDelElfo() {
  const unlocked = useProgressStore((state) => isElfoHouseUnlocked(state.progress));
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.casaElfoExterior);
  const interiorVisible = useVisibleFrom(VISIBLE_FROM.casaElfoInterior);
  const warming = useWorldStore((state) => state.warming);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.casaElfo);

  return (
    <group name="CasaDelElfo">
      <ElfoExterior locked={!unlocked} visible={exteriorVisible} />
      <StaticModel url={ARBOL_URL} visible={exteriorVisible} />
      <group visible={interiorVisible}>
        <StaticModel url={INTERIOR_URL} merge />
        <Collectibles items={ELFO_COLLECTIBLES} active={interiorVisible && !warming} enabled={unlocked} onCollect={collectElfoItem} />
      </group>
      <CuboidColliders boxes={ELFO_COLLIDER_BOXES} />
      <CameraColliderBoxes boxes={ELFO_CAMERA_BOXES} active={cameraActive} />
    </group>
  );
}

useGLTF.preload([INTERIOR_URL, ARBOL_URL, ...ELFO_COLLECTIBLES.map(({ url }) => url)]);
