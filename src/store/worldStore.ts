import { create } from 'zustand';

interface WorldState {
  // Mientras se calienta todo se dibuja (sin importar la región) para que el renderer compile cada material y suba cada
  // malla detrás de la pantalla de carga; así nada provoca un tirón la primera vez que aparece al recorrer el mapa.
  warming: boolean;
  ready: boolean;
  finishWarmup: () => void;
  resetWorld: () => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  warming: true,
  ready: false,
  finishWarmup: () => set({ warming: false, ready: true }),
  resetWorld: () => set({ warming: true, ready: false }),
}));
