import { create } from 'zustand';

// Which game dialog is open (one at a time; ids are defined by each challenge, e.g. 'desafio1.aldeana') and whether
// the backpack is open. While either is open (or a cinematic plays) the avatar stands still.
interface UIState {
  dialog: string | null;
  backpackOpen: boolean;
  // A cinematic is playing: the camera is taken over, the avatar stands still and the zone follows the camera.
  cinematic: boolean;
  openDialog: (id: string) => void;
  closeDialog: () => void;
  setBackpackOpen: (open: boolean) => void;
  setCinematic: (cinematic: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  dialog: null,
  backpackOpen: false,
  cinematic: false,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setBackpackOpen: (backpackOpen) => set({ backpackOpen }),
  setCinematic: (cinematic) => set({ cinematic }),
}));

export const useDialogOpen = (id: string) => useUIStore((state) => state.dialog === id);

export function isGameplayPaused() {
  const { dialog, backpackOpen, cinematic } = useUIStore.getState();
  return dialog !== null || backpackOpen || cinematic;
}
