import { create } from 'zustand';
import { Vector3 } from 'three';

export const ZUMBADOR_COUNT = 10;

// `position` y `active` los actualiza cada enemigo en su useFrame (sin re-render), igual que playerPosition;
// así los objetos de la mochila pueden medir distancias. `active` = fuera del pozo y vivo.
type EnemyTracker = { position: Vector3; active: boolean };

interface EnemyState {
  golem: EnemyTracker;
  zumbadores: EnemyTracker[];
  golemDefeated: boolean;
  deadZumbadores: number[];
  sprayAt: number | null;
  defeatGolem: () => void;
  killZumbadores: (indices: number[]) => void;
}

export const useEnemyStore = create<EnemyState>((set) => ({
  golem: { position: new Vector3(), active: false },
  zumbadores: Array.from({ length: ZUMBADOR_COUNT }, () => ({ position: new Vector3(), active: false })),
  golemDefeated: false,
  deadZumbadores: [],
  sprayAt: null,
  defeatGolem: () => set({ golemDefeated: true }),
  killZumbadores: (indices) =>
    set((state) => ({ deadZumbadores: [...new Set([...state.deadZumbadores, ...indices])], sprayAt: performance.now() })),
}));
