import { create } from 'zustand';

// The scenes of the fairy's clearing (Bonus 2), one at a time and only in memory. While one runs the avatar is led
// by it, the camera is fixed and leaving or opening a dialog cancels it without saving.

// Cutting the three stalks of the bramble trap (rescate.ts).
export type Rescate = { fase: 'camino' | 'acecho' | 'tajo' | 'seca' | 'aprieta' | 'fin'; desde: number };
// Helping the fairy up once the cage is open (auxilio.ts): she falls, the avatar kneels and holds her hand until her
// wings are strong again, she takes off and the clearing wakes.
export type Auxilio = { fase: 'cae' | 'camino' | 'arrodilla' | 'sostiene' | 'lista' | 'despega' | 'despierta'; desde: number };
// Receiving her amulet (entrega.ts): the avatar kneels by the lectern, she brings it flying, hangs it on the avatar's
// neck and celebrates.
export type Entrega = { fase: 'camino' | 'arrodilla' | 'acerca' | 'cuelga' | 'celebra' | 'guarda'; desde: number };

type ClaroState = {
  rescate: Rescate | null;
  auxilio: Auxilio | null;
  entrega: Entrega | null;
  setRescate: (rescate: Rescate | null) => void;
  setAuxilio: (auxilio: Auxilio | null) => void;
  setEntrega: (entrega: Entrega | null) => void;
};

export const useClaroStore = create<ClaroState>((set) => ({
  rescate: null,
  auxilio: null,
  entrega: null,
  setRescate: (rescate) => set({ rescate }),
  setAuxilio: (auxilio) => set({ auxilio }),
  setEntrega: (entrega) => set({ entrega }),
}));

// Whether any scene of the clearing is running.
export const enEscena = () => {
  const { rescate, auxilio, entrega } = useClaroStore.getState();
  return rescate !== null || auxilio !== null || entrega !== null;
};
