import { isTouchDevice } from '@/hooks/useIsMobile';
import { knownBackend, type RenderBackend } from './backend';

// Render quality, decided once per device and per backend. Phones report 2–3x pixel ratios: rendering every one of
// those pixels is what drains them, so they cap lower and skip MSAA. Desktops with WebGPU can render above their screen
// (supersampling) when the GPU has room, which smooths edges and textures.
//
// WebGL 2 is where the game lands on devices without WebGPU and on the ones whose WebGPU failed. It looks the same
// there: the screen's own resolution, MSAA and the same texture filtering (a first, lighter setting, capped at 1x and
// without MSAA, looked blurred and jagged on screens scaled above 100 %). The one difference is that it never renders
// above the screen's resolution, because three's WebGL 2 backend costs more per draw. A device that cannot keep up
// loses resolution little by little (AdaptiveResolution), as with WebGPU.
const DEVICE_DPR = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
const TOUCH = isTouchDevice();

export type RenderQuality = {
  // 4x MSAA.
  antialias: boolean;
  // Anisotropic filtering keeps textures seen at a grazing angle (roofs, terrain) sharp instead of striped.
  anisotropy: number;
  // Where the world starts and where it falls back to if the frame rate keeps bouncing.
  startDpr: number;
  // PerformanceMonitor's factor (0–1) is mapped linearly from the lowest resolution to the highest, rounded to 0.05 to
  // avoid resizing the canvas for imperceptible changes.
  dprForFactor: (factor: number) => number;
  startFactor: number;
};

function qualityFor(backend: RenderBackend | null): RenderQuality {
  const webgl = backend === 'webgl';
  // Below this the image smears.
  const minDpr = 0.75;
  // The screen's own resolution (phones report 2–3x: they stop at 1.5x); with WebGPU a desktop may go above it.
  const native = TOUCH ? Math.min(DEVICE_DPR, 1.5) : Math.min(Math.max(DEVICE_DPR, 1), 2);
  const maxDpr = TOUCH || webgl ? native : Math.min(native * 1.5, 2);
  // WebGL 2 starts sharp, at the screen's resolution; WebGPU starts at 1x and climbs while there is room.
  const startDpr = webgl ? native : Math.min(DEVICE_DPR, 1);
  return {
    antialias: !TOUCH,
    anisotropy: TOUCH ? 4 : 8,
    startDpr,
    dprForFactor: (factor) => Math.round((minDpr + (maxDpr - minDpr) * factor) * 20) / 20,
    startFactor: maxDpr > minDpr ? (startDpr - minDpr) / (maxDpr - minDpr) : 1,
  };
}

let quality: { backend: RenderBackend | null; value: RenderQuality } | null = null;

// The quality for what draws the game on this device. The backend is known before any 3D canvas mounts (see
// useRenderBackend), so whoever asks from inside the world gets the settled answer.
export function renderQuality(): RenderQuality {
  const backend = knownBackend();
  if (quality?.backend !== backend) quality = { backend, value: qualityFor(backend) };
  return quality.value;
}
