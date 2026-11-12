import { create } from 'zustand';
import { Vector3 } from 'three';

export type PlayerAction = 'Idle' | 'Walking' | 'Running' | 'Death';
export type Point = { x: number; y: number; z: number };
// Where the avatar appears and which way it faces (yaw around +y; 0 faces +z).
export type Spawn = Point & { yaw: number };

const MAX_HEALTH = 100;

// State of the avatar while playing. The profile (name, chosen character) lives in authStore.
interface PlayerState {
  action: PlayerAction;
  health: number;
  maxHealth: number;
  // Feet of the avatar in world space. Avatar mutates it in place every frame: reading it never re-renders.
  position: Vector3;
  // Camera distance override (e.g. zoomed in at the bottom of a well); null keeps the default third-person distance.
  cameraDistance: number | null;
  // Optional one-shot spawn override (used by ?dev=... presets); consumed once when GameCanvas mounts.
  initialSpawn: Spawn | null;
  // Teleport applied by PlayerController on the next frame.
  teleportRequest: Point | null;
  // A scripted scene leads the avatar: the player's keys are ignored and it walks by itself to `walkTo` (or stands
  // still while that is null). The camera stays free. null = the player is in control.
  guide: { walkTo: Point | null } | null;
  setGuide: (guide: PlayerState['guide']) => void;
  setAction: (action: PlayerAction) => void;
  // Health reaching 0 plays Death; PlayerController then respawns the player.
  takeDamage: (amount: number) => void;
  // Gives back health (up to the maximum) while alive.
  heal: (amount: number) => void;
  restoreHealth: () => void;
  setCameraDistance: (distance: number | null) => void;
  setInitialSpawn: (spawn: Spawn | null) => void;
  consumeInitialSpawn: () => Spawn | null;
  requestTeleport: (point: Point) => void;
  clearTeleportRequest: () => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  action: 'Idle',
  health: MAX_HEALTH,
  maxHealth: MAX_HEALTH,
  position: new Vector3(),
  cameraDistance: null,
  initialSpawn: null,
  teleportRequest: null,
  guide: null,
  setGuide: (guide) => set({ guide }),
  setAction: (action) => set({ action }),
  takeDamage: (amount) =>
    set((state) => {
      if (state.health <= 0) return {};
      const health = Math.max(0, state.health - amount);
      return health === 0 ? { health, action: 'Death' } : { health };
    }),
  heal: (amount) => set((state) => (state.health <= 0 ? {} : { health: Math.min(state.maxHealth, state.health + amount) })),
  restoreHealth: () => set((state) => ({ health: state.maxHealth })),
  setCameraDistance: (cameraDistance) => set({ cameraDistance }),
  setInitialSpawn: (initialSpawn) => set({ initialSpawn }),
  consumeInitialSpawn: () => {
    const spawn = get().initialSpawn;
    if (spawn) set({ initialSpawn: null });
    return spawn;
  },
  requestTeleport: (teleportRequest) => set({ teleportRequest }),
  clearTeleportRequest: () => set({ teleportRequest: null }),
  reset: () => set({ action: 'Idle', health: MAX_HEALTH, cameraDistance: null, initialSpawn: null, teleportRequest: null, guide: null }),
}));
