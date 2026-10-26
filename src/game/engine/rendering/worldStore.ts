import { create } from 'zustand';

// Why the 3D world cannot be shown: the browser has no WebGPU, or the GPU device was lost while playing.
export type RendererError = 'unsupported' | 'lost';

interface WorldState {
  // While warming up, Warmup visits the regions one by one so every material is compiled and every mesh uploaded behind
  // the loading screen; afterwards nothing stutters the first time it appears.
  warming: boolean;
  ready: boolean;
  rendererError: RendererError | null;
  finishWarmup: () => void;
  resetWorld: () => void;
  setRendererError: (error: RendererError) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  warming: true,
  ready: false,
  rendererError: null,
  finishWarmup: () => set({ warming: false, ready: true }),
  resetWorld: () => set({ warming: true, ready: false }),
  setRendererError: (rendererError) => set({ rendererError }),
}));
