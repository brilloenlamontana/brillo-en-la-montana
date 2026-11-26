import { playSfx } from '@/game/engine/audio/audio';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTerrainHeight } from '@/game/engine/physics/useTerrainHeight';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { areWellsSafe, hasItem } from '../mission';
import { usePantanoStore } from '../pantanoStore';
import { findWellExit, findWellUnder, isInsideWell, usePantanoWells, type Well } from './wells';

// The feet this far below a rim, over the opening of a well: the mud has the player, who starts to sink.
const SINK_DEPTH = 0.3;
// How fast the mud swallows (m/s). From SINK_DEPTH to FALL_DEPTH it takes about five seconds: time to see the avatar
// go down into the mud, and to throw the rope.
const SINK_SPEED = 0.35;
// Sinking but not going down for this long (s): something solid is underfoot after all, and the mud lets go.
const SINK_STALL = 0.8;
// The feet this far below a rim means the mud closed over the player (the capsule center is then 1.5 m below it).
const FALL_DEPTH = 2.5;
// Inside the well the camera keeps its usual distance from the avatar and ignores the walls of the well: the black
// shell under the ground (PantanoPozosOscuridad) reaches 1.2 m past them, so within WELL_CAMERA_ROOM of the walls the
// camera still sees nothing but dark, and never ends up against the avatar's face.
const WELL_CAMERA_DISTANCE = 2;
const WELL_CAMERA_ROOM = 0.8;

// A well that has the player: sinking at first, `under` once the mud closed over them.
type Trap = { well: Well; under: boolean; climbing: boolean; lastY: number; stalled: number };

const toast = (message: string) => useToastStore.getState().showToast(message);

// Every swamp well is a trap. Whoever steps on one does not drop out of sight: the mud swallows them slowly
// (playerStore.sink), and all that while the rope gets them out. Once the mud closes over them, without the rope it is
// death (Death, then respawn); with the rope the player waits in the dark at the bottom until using it from the
// backpack, and climbs out beside the well. Once the golem and every zumbador are defeated the wells get lids; if that
// happens while trapped, the player climbs out too.
export function WellTrap() {
  const wells = usePantanoWells();
  const terrainHeight = useTerrainHeight();
  const trap = useRef<Trap | null>(null);
  // A well whose mud let go of the player (see SINK_STALL): it does not take hold again until they step off it.
  const letGo = useRef<Well | null>(null);

  useFrame((_, delta) => {
    const player = usePlayerStore.getState();
    const pantano = usePantanoStore.getState();
    const { progress } = useProgressStore.getState();
    const { x, y, z } = player.position;
    const current = trap.current;

    const release = () => {
      trap.current = null;
      if (usePlayerStore.getState().sink !== null) player.setSink(null);
      if (pantano.trappedInWell) pantano.setTrappedInWell(false);
    };

    if (!current) {
      if (player.health <= 0 || areWellsSafe(progress)) return;
      const deep = findWellUnder(wells, x, y, z, FALL_DEPTH);
      const well = deep ?? findWellUnder(wells, x, y, z, SINK_DEPTH);
      if (!well) {
        letGo.current = null;
        return;
      }
      // Over the opening itself, with no ground under the feet: not on a slope beside the well.
      if (!deep && (well === letGo.current || terrainHeight(x, z, y + 0.5, FALL_DEPTH + 1) !== null)) return;
      trap.current = { well, under: false, climbing: false, lastY: y, stalled: 0 };
      playSfx('d1_hundirse');
      player.setSink(SINK_SPEED);
      const rope = hasItem('soga', progress);
      // The rope works from the first moment, not only at the bottom.
      if (rope) pantano.setTrappedInWell(true);
      toast(rope ? '¡Te hundes en un pozo de lodo! Usa la soga para salir.' : '¡Te hundes en un pozo de lodo!');
      return;
    }

    const { well } = current;
    // Out of the well (climbed, or respawned after dying in it): the trap is armed again.
    if (!isInsideWell(well, x, y, z)) return release();

    if (!current.climbing && (pantano.climbRequested || areWellsSafe(progress))) {
      current.climbing = true;
      player.setSink(null);
      player.setCameraDistance(null);
      // The ground as it really is beside the well (looked for from well above its rim).
      player.requestTeleport(findWellExit(well, wells, (px, pz) => terrainHeight(px, pz, well.rimY + 12, 24)));
      return;
    }
    if (current.under || current.climbing) return;

    // Still sinking. Fallen to an enemy meanwhile: the mud keeps the body.
    if (player.health <= 0) {
      if (player.sink !== null) player.setSink(null);
      return;
    }
    if (y < well.rimY - FALL_DEPTH) {
      current.under = true;
      player.setSink(null);
      player.setCameraDistance(WELL_CAMERA_DISTANCE, { x: well.x, z: well.z, radius: well.outerRadius + WELL_CAMERA_ROOM });
      if (!hasItem('soga', progress)) player.takeDamage(player.maxHealth);
      return;
    }
    current.stalled = y < current.lastY - 0.0005 ? 0 : current.stalled + delta;
    current.lastY = y;
    if (current.stalled > SINK_STALL) {
      letGo.current = well;
      release();
    }
  });

  return null;
}
