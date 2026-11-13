import { create } from 'zustand';
import { Vector3 } from 'three';

// The arm wrestling with the Ogre, step by step:
//   camino   both go to their side of the table (the avatar walks by itself)
//   acomodo  they settle: he plants his elbow, the player takes his hand
//   juego    the player pushes with every click, he pushes back all the time
//   gana / pierde   decided: the arm goes all the way down, then it is over
export type PulsoFase = 'camino' | 'acomodo' | 'juego' | 'gana' | 'pierde';
// `desde`: moment (performance.now()) the step began. `paso`: point of the avatar's way to its seat it walks to.
export type Pulso = { fase: PulsoFase; desde: number; conGuante: boolean; paso: number };

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
  // Moment the Ogre last threw the player back.
  ogroRepelAt: number | null;
  repelerOgro: () => void;
  // The arm wrestling under way (see ogro/pulso.ts), or null.
  pulso: Pulso | null;
  setPulso: (pulso: Pulso | null) => void;
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
  pulso: null,
  setPulso: (pulso) => set({ pulso }),
  ogroVencidoAt: null,
  celebrarOgro: () => set({ ogroVencidoAt: performance.now(), pulso: null }),
}));
