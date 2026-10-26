import { Texture } from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { ANISOTROPY, ANTIALIAS } from './resolution';
import { useWorldStore } from './worldStore';

// Every texture created from now on (the GLB textures are created when each file finishes loading, after this module
// runs) uses anisotropic filtering.
Texture.DEFAULT_ANISOTROPY = ANISOTROPY;

// What R3F passes to the gl factory (the part used here).
type CanvasProps = { canvas: unknown; alpha?: boolean };

type GPUProbe = { requestAdapter(options?: { powerPreference?: 'high-performance' | 'low-power' }): Promise<unknown> };

// The game only renders with WebGPU. Checked before mounting the canvas: three's WebGPURenderer would otherwise fall
// back to WebGL 2 silently.
export async function isWebGPUAvailable(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: GPUProbe }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter({ powerPreference: 'high-performance' })) != null;
  } catch {
    return false;
  }
}

// Renderer factory for <Canvas gl> (R3F hands it the canvas). `high-performance` picks the discrete GPU on laptops
// that have two. MSAA only on desktop (see resolution.ts).
export async function createRenderer({ canvas, alpha }: CanvasProps) {
  const renderer = new WebGPURenderer({ canvas: canvas as HTMLCanvasElement, alpha, antialias: ANTIALIAS, powerPreference: 'high-performance' });
  await renderer.init();
  if (!(renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend) {
    useWorldStore.getState().setRendererError('unsupported');
  }
  renderer.onDeviceLost = (info) => {
    console.error('WebGPU lost the GPU device:', info);
    useWorldStore.getState().setRendererError('lost');
  };
  return renderer;
}
