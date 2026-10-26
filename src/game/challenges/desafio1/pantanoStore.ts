import { create } from 'zustand';
import { Vector3 } from 'three';
import { ZUMBADOR_COUNT } from './mission';

// Each enemy writes its position every frame (mutated in place, no re-renders) so the backpack items can measure
// distances. `active` = out of its well and alive. Defeats are saved in progress (golemDefeated, zumbadoresDefeated).
type EnemyTracker = { position: Vector3; active: boolean };

// Live state of the Swamp of Sadness, shared by its enemies, its wells and the Challenge 1 backpack.
interface PantanoState {
  // The player treads on the mud: this is what wakes the golem and the zumbadores.
  playerOnMud: boolean;
  golem: EnemyTracker;
  zumbadores: EnemyTracker[];
  // Moment of the last insecticide spray (drives SprayEffect).
  sprayAt: number | null;
  // Fell into a well carrying the rope: waits at the bottom until the rope is used.
  trappedInWell: boolean;
  climbRequested: boolean;
  setPlayerOnMud: (onMud: boolean) => void;
  spray: () => void;
  setTrappedInWell: (trapped: boolean) => void;
  requestClimb: () => void;
}

export const usePantanoStore = create<PantanoState>((set) => ({
  playerOnMud: false,
  golem: { position: new Vector3(), active: false },
  zumbadores: Array.from({ length: ZUMBADOR_COUNT }, () => ({ position: new Vector3(), active: false })),
  sprayAt: null,
  trappedInWell: false,
  climbRequested: false,
  setPlayerOnMud: (playerOnMud) => set({ playerOnMud }),
  spray: () => set({ sprayAt: performance.now() }),
  setTrappedInWell: (trappedInWell) => set({ trappedInWell, climbRequested: false }),
  requestClimb: () => set({ climbRequested: true }),
}));
