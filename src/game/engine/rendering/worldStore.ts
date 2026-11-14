import { create } from 'zustand';
import type { RenderBackend } from './backend';

// Why the 3D world cannot be shown: the browser can draw neither with WebGPU nor with WebGL 2, or the GPU device was
// lost while playing.
export type RendererError = 'unsupported' | 'lost';

// The world opens in two steps: downloading and decoding the models, then preparing the part of the map where the
// player appears (see Warmup).
export type LoadStage = 'downloading' | 'preparing';

// Share of the loading bar the downloads take; preparing the map fills the rest.
const DOWNLOAD_SHARE = 80;

interface WorldState {
  // While warming up, Warmup visits the regions one by one so every material is compiled and every mesh uploaded behind
  // the loading screen; afterwards nothing stutters the first time it appears.
  warming: boolean;
  ready: boolean;
  rendererError: RendererError | null;
  // What draws the world (see backend.ts); null until its renderer exists.
  backend: RenderBackend | null;
  // Loading progress for the loading screen, 0-100. It only goes up: a new batch of downloads never takes it back,
  // and once preparing starts the downloads no longer move it.
  loadStage: LoadStage;
  loadPercent: number;
  reportDownload: (loaded: number, total: number) => void;
  reportPrepared: (done: number, total: number) => void;
  finishWarmup: () => void;
  resetWorld: () => void;
  setRendererError: (error: RendererError) => void;
  setBackend: (backend: RenderBackend) => void;
}

const raise = (current: number, next: number) => Math.max(current, Math.min(100, Math.round(next)));

export const useWorldStore = create<WorldState>((set) => ({
  warming: true,
  ready: false,
  rendererError: null,
  backend: null,
  loadStage: 'downloading',
  loadPercent: 0,
  reportDownload: (loaded, total) =>
    set((state) =>
      state.loadStage !== 'downloading' || total === 0 ? {} : { loadPercent: raise(state.loadPercent, (loaded / total) * DOWNLOAD_SHARE) },
    ),
  reportPrepared: (done, total) =>
    set((state) => ({
      loadStage: 'preparing',
      loadPercent: raise(state.loadPercent, DOWNLOAD_SHARE + (done / Math.max(1, total)) * (100 - DOWNLOAD_SHARE)),
    })),
  finishWarmup: () => set({ warming: false, ready: true, loadPercent: 100 }),
  resetWorld: () => set({ warming: true, ready: false, loadStage: 'downloading', loadPercent: 0 }),
  setRendererError: (rendererError) => set({ rendererError }),
  setBackend: (backend) => set({ backend }),
}));
