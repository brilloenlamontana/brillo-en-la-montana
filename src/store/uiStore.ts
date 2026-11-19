import { create } from 'zustand';

// Which game dialog is open (one at a time; ids are defined by each challenge, e.g. 'desafio1.aldeana') and whether
// the backpack is open. While either is open (or a cinematic plays, or the user manual is being read) the avatar
// stands still.
interface UIState {
  dialog: string | null;
  backpackOpen: boolean;
  // A cinematic is playing: the camera is taken over, the avatar stands still and the zone follows the camera.
  cinematic: boolean;
  // The user manual is open over the game (components/manual/UserManual).
  manualOpen: boolean;
  openDialog: (id: string) => void;
  closeDialog: () => void;
  setBackpackOpen: (open: boolean) => void;
  setCinematic: (cinematic: boolean) => void;
  setManualOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  dialog: null,
  backpackOpen: false,
  cinematic: false,
  manualOpen: false,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setBackpackOpen: (backpackOpen) => set({ backpackOpen }),
  setCinematic: (cinematic) => set({ cinematic }),
  setManualOpen: (manualOpen) => set({ manualOpen }),
}));

export const useDialogOpen = (id: string) => useUIStore((state) => state.dialog === id);

export function isGameplayPaused() {
  const { dialog, backpackOpen, cinematic, manualOpen } = useUIStore.getState();
  return dialog !== null || backpackOpen || cinematic || manualOpen;
}
