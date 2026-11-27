import { create } from 'zustand';

// Which game dialog is open (one at a time; ids are defined by each challenge, e.g. 'desafio1.aldeana') and whether
// the backpack is open. While a narration is told the avatar walks freely (items and interactions wait); the backpack,
// a cinematic, the manual and the introduction video hold it still (see isMovementPaused and isGameplayPaused).
interface UIState {
  dialog: string | null;
  backpackOpen: boolean;
  // A cinematic is playing: the camera is taken over, the avatar stands still and the zone follows the camera.
  cinematic: boolean;
  // The user manual is open over the game (components/manual/UserManual).
  manualOpen: boolean;
  // The introduction video is being watched again, over the game (hud/IntroVideo, asked for with IntroButton).
  introOpen: boolean;
  setIntroOpen: (open: boolean) => void;
  // The tutorial of the controls is showing (hud/Tutorial): the game goes on under it. `tutorialRun` counts the times
  // it was opened, so asking for it again starts it over.
  tutorialOpen: boolean;
  tutorialRun: number;
  openTutorial: () => void;
  // Counts the times the player asked to see the objective again (touch screens: hud/ObjectiveLine).
  objectiveRun: number;
  showObjective: () => void;
  closeTutorial: () => void;
  // Touch screens: the RUN button was tapped and stays on, so the joystick runs until it is tapped again (MobileControls).
  running: boolean;
  toggleRunning: () => void;
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
  introOpen: false,
  setIntroOpen: (introOpen) => set({ introOpen }),
  tutorialOpen: false,
  tutorialRun: 0,
  openTutorial: () => set((state) => ({ tutorialOpen: true, tutorialRun: state.tutorialRun + 1 })),
  closeTutorial: () => set({ tutorialOpen: false }),
  objectiveRun: 0,
  showObjective: () => set((state) => ({ objectiveRun: state.objectiveRun + 1 })),
  running: false,
  toggleRunning: () => set((state) => ({ running: !state.running })),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setBackpackOpen: (backpackOpen) => set({ backpackOpen }),
  setCinematic: (cinematic) => set({ cinematic }),
  setManualOpen: (manualOpen) => set({ manualOpen }),
}));

export const useDialogOpen = (id: string) => useUIStore((state) => state.dialog === id);

// Narrations during which the avatar stands still after all, because a scene that moves it follows (the statue of
// the hut, the fairy of the clearing): walking away meanwhile left that scene without its avatar. Each challenge
// names its own (see its dialogs.ts).
const HOLDING = new Set<string>();
export const holdAvatarDuring = (...dialogs: string[]) => dialogs.forEach((dialog) => HOLDING.add(dialog));

// Whether the avatar has to stand still. A narration does not hold it any more: while a character or the narrator
// speaks the player walks and looks around freely, listening. Only a "bajo" does (the avatar has fallen), the
// narrations of the two bonuses (HOLDING), and what takes the whole screen: the backpack, a cinematic, the manual, the introduction video.
export function isMovementPaused() {
  const { dialog, backpackOpen, cinematic, manualOpen, introOpen } = useUIStore.getState();
  return (dialog !== null && (dialog.startsWith('bajo.') || HOLDING.has(dialog))) || backpackOpen || cinematic || manualOpen || introOpen;
}

// Whether the game's own actions wait: using an item, starting an interaction (so that a second narration is never
// opened over the one being told). True during any narration, though the avatar walks on (isMovementPaused).
export function isGameplayPaused() {
  const { dialog, backpackOpen, cinematic, manualOpen, introOpen } = useUIStore.getState();
  return dialog !== null || backpackOpen || cinematic || manualOpen || introOpen;
}
