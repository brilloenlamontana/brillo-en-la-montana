import { create } from 'zustand';

interface ZoneState {
  insideVillaBoj: boolean;
  insidePantano: boolean;
  setInsideVillaBoj: (inside: boolean) => void;
  setInsidePantano: (inside: boolean) => void;
}

export const useZoneStore = create<ZoneState>((set) => ({
  insideVillaBoj: false,
  insidePantano: false,
  setInsideVillaBoj: (insideVillaBoj) => set({ insideVillaBoj }),
  setInsidePantano: (insidePantano) => set({ insidePantano }),
}));
