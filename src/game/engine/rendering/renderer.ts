import { Texture } from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { detectBackend, rememberWebGPUFailed, settleBackend, type RenderBackend } from './backend';
import { renderQuality } from './resolution';
import { useWorldStore } from './worldStore';

// Development only: the performance meter is on (`?perf=0` turns it off). With it the renderer asks the graphics card
// to time each frame (WebGPU only grants that when the device is created), which costs a little: never in the
// published game.
export const DEV_STATS = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('perf') !== '0';

// What R3F passes to the gl factory (the part used here).
type CanvasProps = { canvas: unknown; alpha?: boolean };

// WebGPU failed on this device: it is remembered (backend.ts) and the page reloads, which opens the game in WebGL 2.
// Returns false when there is nothing else to try.
function retryInWebGL(why: unknown): boolean {
  console.error('WebGPU failed; the game will open with WebGL 2:', why);
  if (!rememberWebGPUFailed()) return false;
  window.location.reload();
  return true;
}

// A renderer on the backend this device can use (backend.ts): WebGPU, or WebGL 2 where there is none. The same class
// draws with both. `high-performance` picks the discrete GPU on laptops that have two. `antialias` may be turned off
// by the quality of the backend (resolution.ts).
export async function newRenderer(canvas: HTMLCanvasElement, options: { alpha?: boolean; antialias: boolean }) {
  const wanted = await detectBackend();
  const quality = renderQuality();
  // Every texture created from now on (the GLB textures are created when each file finishes loading) uses anisotropic
  // filtering.
  Texture.DEFAULT_ANISOTROPY = quality.anisotropy;
  const renderer = new WebGPURenderer({
    canvas,
    alpha: options.alpha,
    antialias: options.antialias && quality.antialias,
    powerPreference: 'high-performance',
    forceWebGL: wanted !== 'webgpu',
    trackTimestamp: DEV_STATS,
  });
  await renderer.init();
  // What it really ended up drawing with (three itself falls back to WebGL 2 if the WebGPU device cannot be created).
  const webgpu = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;
  const backend: RenderBackend = wanted === 'none' ? wanted : webgpu ? 'webgpu' : 'webgl';
  settleBackend(backend);
  return { renderer, backend };
}

// Renderer factory for <Canvas gl> of the world and of the backpack (R3F hands it the canvas). MSAA only on desktop
// with WebGPU (see resolution.ts). It tells the world which backend draws it. If the graphics card is lost while
// WebGPU draws, the game reloads in WebGL 2 by itself; if it is lost in WebGL 2 too, the player is told.
export async function createRenderer({ canvas, alpha }: CanvasProps) {
  let created: Awaited<ReturnType<typeof newRenderer>>;
  try {
    created = await newRenderer(canvas as HTMLCanvasElement, { alpha, antialias: true });
  } catch (error) {
    // The device could not be created at all.
    if ((await detectBackend()) !== 'webgpu' || !retryInWebGL(error)) useWorldStore.getState().setRendererError('unsupported');
    throw error;
  }
  const { renderer, backend } = created;
  const world = useWorldStore.getState();
  world.setBackend(backend);
  if (backend === 'none') world.setRendererError('unsupported');
  // (WebGL 2 reports a lost context through the same callback.)
  renderer.onDeviceLost = (info) => {
    if (backend === 'webgpu' && retryInWebGL(info)) return;
    console.error('The GPU device was lost:', info);
    useWorldStore.getState().setRendererError('lost');
  };
  return renderer;
}
