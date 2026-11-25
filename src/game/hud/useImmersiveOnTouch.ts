import { useEffect } from 'react';
import { isTouchDevice } from '@/hooks/useIsMobile';

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

const lockable = () => (typeof screen === 'undefined' ? undefined : (screen.orientation as LockableOrientation | undefined));

// Whether this browser lets a page go full screen and lay the screen on its side by itself (Android Chrome does;
// iPhone Safari offers neither).
export const canTurnScreen = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && !!lockable()?.lock;

// Goes full screen and lays the screen on its side, even with the phone's rotation locked. Only works from a tap.
// Rejects where the browser refuses.
export async function turnScreen(): Promise<void> {
  const lock = lockable()?.lock;
  if (!document.documentElement.requestFullscreen || !lock) throw new Error('unsupported');
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  await lock.call(screen.orientation, 'landscape');
}

// On a phone or tablet the game is played full screen with the screen lying on its side. Browsers only allow both after
// a tap, so the first tap anywhere asks for them (where the browser offers neither, the turn stays with the player, see
// LandscapeOnly). Once granted, nothing else is asked.
export function useImmersiveOnTouch() {
  useEffect(() => {
    if (!isTouchDevice() || !canTurnScreen()) return;
    const onFirstTap = () => {
      turnScreen()
        .then(() => window.removeEventListener('pointerdown', onFirstTap))
        .catch(() => {});
    };
    window.addEventListener('pointerdown', onFirstTap);
    return () => window.removeEventListener('pointerdown', onFirstTap);
  }, []);
}
