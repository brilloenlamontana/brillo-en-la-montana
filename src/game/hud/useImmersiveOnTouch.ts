import { useEffect } from 'react';
import { isTouchDevice } from '@/hooks/useIsMobile';

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

// On a phone or tablet the game is played full screen with the screen lying on its side. Browsers only allow both after
// a tap, so the first tap anywhere asks for them (Android Chrome does; iPhone Safari offers no full screen for a page
// and no lock, so there the turn stays with the player, see LandscapeOnly). Once granted, nothing else is asked.
export function useImmersiveOnTouch() {
  useEffect(() => {
    if (!isTouchDevice()) return;
    const onFirstTap = () => {
      const orientation = screen.orientation as LockableOrientation | undefined;
      const asked = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      if (!asked) return;
      asked
        .then(() => orientation?.lock?.('landscape'))
        .then(() => window.removeEventListener('pointerdown', onFirstTap))
        .catch(() => {});
    };
    window.addEventListener('pointerdown', onFirstTap);
    return () => window.removeEventListener('pointerdown', onFirstTap);
  }, []);
}
