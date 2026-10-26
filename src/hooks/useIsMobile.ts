import { useSyncExternalStore } from 'react';

// Touch device (phone or tablet). `?mobile=1` forces it, to test the touch controls on a desktop.
// One shared detection for the whole app: every caller reads the same value and listeners are added once.
let touched = false;

function detect(): boolean {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(window.location.search).get('mobile');
  if (forced === 'true' || forced === '1') return true;
  if (touched) return true;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  return hasTouch && (mobileAgent || coarsePointer || window.innerWidth <= 1024);
}

function subscribe(onChange: () => void) {
  const coarse = window.matchMedia('(pointer: coarse)');
  // A real touch settles it: the touch controls must show.
  const onTouch = () => {
    touched = true;
    onChange();
  };
  window.addEventListener('resize', onChange);
  coarse.addEventListener('change', onChange);
  window.addEventListener('touchstart', onTouch, { passive: true, once: true });
  return () => {
    window.removeEventListener('resize', onChange);
    coarse.removeEventListener('change', onChange);
    window.removeEventListener('touchstart', onTouch);
  };
}

export const useIsMobile = (): boolean => useSyncExternalStore(subscribe, detect, () => false);

// Same answer outside React (e.g. to choose render quality once).
export const isTouchDevice = detect;
