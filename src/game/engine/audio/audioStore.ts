import { create } from 'zustand';

const MUTED_KEY = 'brillo.sonido';
const VOLUMES_KEY = 'brillo.volumenes';

// What the player can turn up or down, each from 0 to 1: everything at once and each kind of sound. 1 is the mix the
// game was made with (see BUS_VOLUME in audio.ts).
export type VolumeChannel = 'general' | 'voces' | 'musica' | 'ambiente' | 'efectos';
export type Volumes = Record<VolumeChannel, number>;
export const DEFAULT_VOLUMES: Volumes = { general: 1, voces: 1, musica: 1, ambiente: 1, efectos: 1 };

function readMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === 'off';
  } catch {
    return false;
  }
}

function readVolumes(): Volumes {
  try {
    const saved = JSON.parse(localStorage.getItem(VOLUMES_KEY) ?? '{}') as Partial<Record<VolumeChannel, unknown>>;
    const volumes = { ...DEFAULT_VOLUMES };
    for (const channel of Object.keys(DEFAULT_VOLUMES) as VolumeChannel[]) {
      const value = Number(saved[channel]);
      if (Number.isFinite(value)) volumes[channel] = Math.min(1, Math.max(0, value));
    }
    return volumes;
  } catch {
    return { ...DEFAULT_VOLUMES };
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing: the choice lasts for this visit only.
  }
}

// Whether the player silenced the game and how loud each kind of sound plays; remembered on this device.
interface AudioState {
  muted: boolean;
  volumes: Volumes;
  toggleMuted: () => void;
  setVolume: (channel: VolumeChannel, volume: number) => void;
  resetVolumes: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: readMuted(),
  volumes: readVolumes(),
  toggleMuted: () => {
    const muted = !get().muted;
    remember(MUTED_KEY, muted ? 'off' : 'on');
    set({ muted });
  },
  setVolume: (channel, volume) => {
    const level = Math.min(1, Math.max(0, volume));
    const before = get().volumes;
    const volumes = { ...before, [channel]: level };
    // The general volume carries every kind of sound along with it, in proportion (from silence, all to its level),
    // so their bars move with it. Each kind can then be set on its own.
    if (channel === 'general') {
      for (const other of Object.keys(DEFAULT_VOLUMES) as VolumeChannel[]) {
        if (other === 'general') continue;
        volumes[other] = before.general > 0.001 ? Math.min(1, (before[other] * level) / before.general) : level;
      }
    }
    remember(VOLUMES_KEY, JSON.stringify(volumes));
    // Turning a sound up brings the game out of silence.
    if (get().muted && volume > 0) {
      remember(MUTED_KEY, 'on');
      set({ volumes, muted: false });
    } else set({ volumes });
  },
  resetVolumes: () => {
    remember(VOLUMES_KEY, JSON.stringify(DEFAULT_VOLUMES));
    set({ volumes: { ...DEFAULT_VOLUMES } });
  },
}));
