import { create } from 'zustand';
import { Vector3 } from 'three';

// Live state of the Summit tunnels, shared by the spectre, the Ogre, the compass trail, the Challenge 3 backpack and
// its HUD. What is achieved is saved in progress (espectroCalmado, ogroVencido...).
interface TunelState {
  // The compass is out: a glowing trail shows the way to the summit exit.
  brujulaActiva: boolean;
  toggleBrujula: () => void;
  // The spectre writes its position every frame (mutated in place); `active` = it is out and haunting.
  espectro: { position: Vector3; active: boolean };
  // How close the spectre is, 0 (far) to 1 (touching), in steps: drives the cold on the screen.
  frio: number;
  setFrio: (frio: number) => void;
  // Moment of the spectre's last touch (flash on the screen).
  toqueAt: number | null;
  tocar: () => void;
  // The doll was just handed over here: the girl says goodbye from this spot.
  despedida: { x: number; y: number; z: number } | null;
  setDespedida: (despedida: TunelState['despedida']) => void;
  // Moment the Ogre last threw the player back, and the arm wrestling under way.
  ogroRepelAt: number | null;
  repelerOgro: () => void;
  pulsoAt: number | null;
  setPulso: (pulsoAt: number | null) => void;
  // Moment the Ogre was beaten in this visit (he celebrates for a while).
  ogroVencidoAt: number | null;
  celebrarOgro: () => void;
}

export const useTunelStore = create<TunelState>((set) => ({
  brujulaActiva: false,
  toggleBrujula: () => set((state) => ({ brujulaActiva: !state.brujulaActiva })),
  espectro: { position: new Vector3(), active: false },
  frio: 0,
  setFrio: (frio) => set({ frio }),
  toqueAt: null,
  tocar: () => set({ toqueAt: performance.now() }),
  despedida: null,
  setDespedida: (despedida) => set({ despedida }),
  ogroRepelAt: null,
  repelerOgro: () => set({ ogroRepelAt: performance.now() }),
  pulsoAt: null,
  setPulso: (pulsoAt) => set({ pulsoAt }),
  ogroVencidoAt: null,
  celebrarOgro: () => set({ ogroVencidoAt: performance.now(), pulsoAt: null }),
}));
