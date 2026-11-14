// What draws the game on this device. WebGPU where the browser and the graphics card offer it; otherwise WebGL 2, which
// three's WebGPURenderer also speaks (its shaders are written in TSL, which it compiles to WGSL or to GLSL by itself: no
// shader of the game is written twice). 'none': neither works, and the world cannot be drawn.
//
// WebGPU is always tried first. A device goes on to WebGL 2 when it has no WebGPU, when the only WebGPU it has is
// drawn by software (slower than its WebGL), or when WebGPU failed on it a short while ago (see rememberWebGPUFailed).
export type RenderBackend = 'webgpu' | 'webgl' | 'none';

type AdapterProbe = { isFallbackAdapter?: boolean; info?: { isFallbackAdapter?: boolean } };
type GPUProbe = { requestAdapter(options?: { powerPreference?: 'high-performance' | 'low-power' }): Promise<AdapterProbe | null> };

// `?render=webgl` forces WebGL 2 where WebGPU works too, to try the game as a device without WebGPU would run it;
// `?render=webgpu` forgets a remembered failure and tries WebGPU again.
const asked = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('render'));

// A WebGPU that lost its device (a driver that hangs, a graphics card that resets) is not tried again on this device
// for a while: the game opens straight in WebGL 2 instead of failing in front of the player every time.
const FAILED_KEY = 'brillo.webgpuFallo';
const FAILED_DAYS = 7;

function webgpuFailedLately(): boolean {
  try {
    const at = Number(localStorage.getItem(FAILED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < FAILED_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

// Called when WebGPU fails while drawing. Returns whether there is something left to try (WebGL 2, on a reload).
export function rememberWebGPUFailed(): boolean {
  try {
    localStorage.setItem(FAILED_KEY, String(Date.now()));
    return true;
  } catch {
    // Without storage the reload would only fail the same way again.
    return false;
  }
}

function forgetWebGPUFailed() {
  try {
    localStorage.removeItem(FAILED_KEY);
  } catch {
    // Nothing to forget.
  }
}

async function hasWebGPU(): Promise<boolean> {
  const gpu = (navigator as unknown as { gpu?: GPUProbe }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return false;
    // Drawn by the processor, not by a graphics card.
    return !(adapter.isFallbackAdapter ?? adapter.info?.isFallbackAdapter ?? false);
  } catch {
    return false;
  }
}

function hasWebGL2(): boolean {
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    if (!context) return false;
    // The probe's context is given back at once: browsers only keep a few alive.
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

let detection: Promise<RenderBackend> | null = null;
let known: RenderBackend | null = null;

// Asked once per visit (the answer does not change); every canvas of the game uses the same one.
export function detectBackend(): Promise<RenderBackend> {
  detection ??= (async () => {
    const forced = asked();
    if (forced === 'webgpu') forgetWebGPUFailed();
    const tryWebGPU = forced !== 'webgl' && !webgpuFailedLately();
    const webgl = hasWebGL2();
    // (A software WebGPU is still better than nothing.)
    const found: RenderBackend = tryWebGPU && (await hasWebGPU()) ? 'webgpu' : webgl ? 'webgl' : tryWebGPU && (navigator as unknown as { gpu?: unknown }).gpu ? 'webgpu' : 'none';
    known = found;
    return found;
  })();
  return detection;
}

// The detected backend, once known (null before); corrected if the renderer ended up on another one.
export const knownBackend = () => known;
export const settleBackend = (backend: RenderBackend) => {
  known = backend;
};
