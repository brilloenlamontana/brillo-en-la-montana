import { create } from 'zustand';
import type { Region } from '../utils/regions';

interface ZoneState {
  // Región del mapa (villa, camino, casa, pantano, bosque o colina): decide qué se dibuja.
  region: Region;
  // Pisando el lodo del pantano: es lo que despierta al golem y a los zumbadores.
  insidePantano: boolean;
  setRegion: (region: Region) => void;
  setInsidePantano: (inside: boolean) => void;
}

export const useZoneStore = create<ZoneState>((set) => ({
  region: 'camino',
  insidePantano: false,
  setRegion: (region) => set({ region }),
  setInsidePantano: (insidePantano) => set({ insidePantano }),
}));
