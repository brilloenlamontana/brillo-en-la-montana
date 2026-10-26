import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { areWellsSafe, hasItem } from '../mission';
import { usePantanoStore } from '../pantanoStore';
import { findWellExit, findWellUnder, isInsideWell, usePantanoWells, type Well } from './wells';

// The feet this far below a rim means the player fell in (the capsule center is then 1.5 m below it).
const FALL_DEPTH = 2.5;
// Inside the well the camera comes close to the avatar, so it does not show the world through the walls.
const WELL_CAMERA_DISTANCE = 1.1;

// Every swamp well is a trap. Falling in without the rope is death (Death, then respawn). With the rope the player
// waits at the bottom until using it from the backpack, and climbs out beside the well. Once the golem and every
// zumbador are defeated the wells get lids; if that happens while trapped, the player climbs out too.
export function WellTrap() {
  const wells = usePantanoWells();
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
      player.setCameraDistance(WELL_CAMERA_DISTANCE);
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
      player.requestTeleport(findWellExit(fallen.current, wells));
    }
  });

  return null;
}
