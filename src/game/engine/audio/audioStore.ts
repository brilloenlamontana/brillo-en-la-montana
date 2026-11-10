import { create } from 'zustand';

const STORAGE_KEY = 'brillo.sonido';

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false;
  }
}

// Whether the player silenced the game; remembered on this device.
interface AudioState {
  muted: boolean;
  toggleMuted: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: readMuted(),
  toggleMuted: () => {
    const muted = !get().muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on');
    } catch {
      // Private browsing: the choice lasts for this visit only.
    }
    set({ muted });
  },
}));
