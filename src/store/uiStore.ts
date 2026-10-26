import { create } from 'zustand';

// Which game dialog is open (one at a time; ids are defined by each challenge, e.g. 'desafio1.aldeano') and whether
// the backpack is open. While either is open the avatar stands still.
interface UIState {
  dialog: string | null;
  backpackOpen: boolean;
  openDialog: (id: string) => void;
  closeDialog: () => void;
  setBackpackOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  dialog: null,
  backpackOpen: false,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setBackpackOpen: (backpackOpen) => set({ backpackOpen }),
}));

export const useDialogOpen = (id: string) => useUIStore((state) => state.dialog === id);

export function isGameplayPaused() {
  const { dialog, backpackOpen } = useUIStore.getState();
  return dialog !== null || backpackOpen;
}
