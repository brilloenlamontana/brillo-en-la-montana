import { create } from 'zustand';
import { Vector3 } from 'three';
import { DUENDE_COUNT } from './mission';

// Each goblin writes its position every frame (mutated in place, no re-renders): the sword measures distances with
// them and the goblins keep apart from each other. `active` = alive and mounted. Defeats are saved in progress
// (duendesDefeated).
type DuendeTracker = { position: Vector3; active: boolean };

export const MAX_HAMBRE = 100;

// Live state of the Dark Forest.
interface BosqueState {
  duendes: DuendeTracker[];
  // Moment of the last sword swing (drives SwordSlash).
  slashAt: number | null;
  slash: () => void;
  // Looking through the elf's lens (toggled from the backpack).
  lente: boolean;
  toggleLente: () => void;
  // Moment the map was used in this visit: the trail it reveals then spreads from the player (see mapa/).
  mapaUsadoAt: number | null;
  usarMapa: () => void;
  // Fullness, from MAX_HAMBRE down to 0 while the forest's hunger applies (`hambreActiva`); at 0 the player loses
  // health. Written by HambreDelBosque.
  hambre: number;
  hambreActiva: boolean;
  setHambre: (hambre: number, hambreActiva: boolean) => void;
}

export const useBosqueStore = create<BosqueState>((set) => ({
  duendes: Array.from({ length: DUENDE_COUNT }, () => ({ position: new Vector3(), active: false })),
  slashAt: null,
  slash: () => set({ slashAt: performance.now() }),
  lente: false,
  toggleLente: () => set((state) => ({ lente: !state.lente })),
  mapaUsadoAt: null,
  usarMapa: () => set({ mapaUsadoAt: performance.now() }),
  hambre: MAX_HAMBRE,
  hambreActiva: false,
  setHambre: (hambre, hambreActiva) => set({ hambre, hambreActiva }),
}));
