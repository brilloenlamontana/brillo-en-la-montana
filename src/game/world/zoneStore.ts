import { create } from 'zustand';
import type { Interior, Region } from './regions';

// Where the player is. ZoneTracker writes it only when it changes, so subscribers re-render once per region change.
interface ZoneState {
  region: Region;
  interior: Interior | null;
  setZone: (region: Region, interior: Interior | null) => void;
}

export const useZoneStore = create<ZoneState>((set) => ({
  region: 'camino',
  interior: null,
  setZone: (region, interior) => set({ region, interior }),
}));
