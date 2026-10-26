import { isTouchDevice } from '@/hooks/useIsMobile';

// Render quality, decided once per device. Phones report 2–3x pixel ratios: rendering every one of those pixels is
// what drains them, so they cap lower and skip MSAA. Desktops can render above their screen (supersampling) when the
// GPU has room, which smooths edges and textures.
const DEVICE_DPR = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
const TOUCH = isTouchDevice();

// Below this the image smears.
const MIN_DPR = 0.75;
// Where the world starts (native resolution, at most 1x) and where it falls back to if the frame rate keeps bouncing.
export const START_DPR = Math.min(DEVICE_DPR, 1);
const MAX_DPR = TOUCH ? Math.min(DEVICE_DPR, 1.5) : Math.min(Math.max(DEVICE_DPR, 1) * 1.5, 2);

// 4x MSAA on desktop GPUs; off on phones.
export const ANTIALIAS = !TOUCH;
// Anisotropic filtering keeps textures seen at a grazing angle (roofs, terrain) sharp instead of striped.
export const ANISOTROPY = TOUCH ? 4 : 8;

// PerformanceMonitor's factor (0–1) is mapped linearly from MIN_DPR to MAX_DPR, rounded to 0.05 to avoid resizing the
// canvas for imperceptible changes.
export const dprForFactor = (factor: number) => Math.round((MIN_DPR + (MAX_DPR - MIN_DPR) * factor) * 20) / 20;
export const START_FACTOR = MAX_DPR > MIN_DPR ? (START_DPR - MIN_DPR) / (MAX_DPR - MIN_DPR) : 1;
