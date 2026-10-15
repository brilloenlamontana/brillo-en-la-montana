import { create } from 'zustand';
import { Vector3 } from 'three';
import { ZUMBADOR_COUNT } from '../constants/mission';

// `position` y `active` los actualiza cada enemigo en su useFrame (sin re-render), igual que playerPosition;
// así los objetos de la mochila pueden medir distancias. `active` = fuera del pozo y vivo.
// Quién ya fue derrotado se guarda en el progreso del jugador (golemDefeated, zumbadoresDefeated).
type EnemyTracker = { position: Vector3; active: boolean };

interface EnemyState {
  golem: EnemyTracker;
  zumbadores: EnemyTracker[];
  sprayAt: number | null;
  spray: () => void;
}

export const useEnemyStore = create<EnemyState>((set) => ({
  golem: { position: new Vector3(), active: false },
  zumbadores: Array.from({ length: ZUMBADOR_COUNT }, () => ({ position: new Vector3(), active: false })),
  sprayAt: null,
  spray: () => set({ sprayAt: performance.now() }),
}));
