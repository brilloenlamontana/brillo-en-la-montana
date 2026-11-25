import { playSfx } from '@/game/engine/audio/audio';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTerrainHeight } from '@/game/engine/physics/useTerrainHeight';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { areWellsSafe, hasItem } from '../mission';
import { usePantanoStore } from '../pantanoStore';
import { findWellExit, findWellUnder, isInsideWell, usePantanoWells, type Well } from './wells';

// The feet this far below a rim means the player fell in (the capsule center is then 1.5 m below it).
const FALL_DEPTH = 2.5;
// Inside the well the camera keeps its usual distance from the avatar and ignores the walls of the well: the black
// shell under the ground (PantanoPozosOscuridad) reaches 1.2 m past them, so within WELL_CAMERA_ROOM of the walls the
// camera still sees nothing but dark, and never ends up against the avatar's face.
const WELL_CAMERA_DISTANCE = 2;
const WELL_CAMERA_ROOM = 0.8;

// Every swamp well is a trap. Falling in without the rope is death (Death, then respawn). With the rope the player
// waits at the bottom until using it from the backpack, and climbs out beside the well. Once the golem and every
// zumbador are defeated the wells get lids; if that happens while trapped, the player climbs out too.
export function WellTrap() {
  const wells = usePantanoWells();
  const terrainHeight = useTerrainHeight();
  const fallen = useRef<Well | null>(null);
  const climbing = useRef(false);

  useFrame(() => {
    const player = usePlayerStore.getState();
    const pantano = usePantanoStore.getState();
    const { progress } = useProgressStore.getState();
    const { x, y, z } = player.position;

    if (!fallen.current) {
      if (player.health <= 0 || areWellsSafe(progress)) return;
      const well = findWellUnder(wells, x, y, z, FALL_DEPTH);
      if (!well) return;
      fallen.current = well;
      playSfx('d1_hundirse');
      player.setCameraDistance(WELL_CAMERA_DISTANCE, { x: well.x, z: well.z, radius: well.outerRadius + WELL_CAMERA_ROOM });
      if (hasItem('soga', progress)) pantano.setTrappedInWell(true);
      else player.takeDamage(player.maxHealth);
      return;
    }

    // Out of the well (climbed, or respawned after dying in it): the trap is armed again.
    if (!isInsideWell(fallen.current, x, y, z)) {
      fallen.current = null;
      climbing.current = false;
      if (pantano.trappedInWell) pantano.setTrappedInWell(false);
      return;
    }

    if (!climbing.current && (pantano.climbRequested || areWellsSafe(progress))) {
      climbing.current = true;
      player.setCameraDistance(null);
      const well = fallen.current;
      // The ground as it really is beside the well (looked for from well above its rim).
      player.requestTeleport(findWellExit(well, wells, (px, pz) => terrainHeight(px, pz, well.rimY + 12, 24)));
    }
  });

  return null;
}
