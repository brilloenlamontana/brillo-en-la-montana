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

// On a phone or tablet the game is played full screen (no address bar, no tabs) with the screen lying on its side.
// Browsers only allow both right after the player touches the page, so every tap asks for them while the page is not
// full screen: the first one grants it, and it is asked again if the player leaves full screen. Chrome on Android
// grants both; an iPad grants full screen only; Safari on iPhone offers neither to a web page (there the only way to
// lose the bars is adding the game to the home screen: see the manifest and the meta tags of index.html).
// The tap is listened to as it ends (pointerup, touchend, click): with a finger, a browser does not count the start of
// a touch (pointerdown) as the player's action, so asking then is refused.
export function useImmersiveOnTouch() {
  useEffect(() => {
    const page = document.documentElement;
    if (!isTouchDevice() || !page.requestFullscreen) return;
    let asking = false;
    const onTap = () => {
      if (document.fullscreenElement || asking) return;
      asking = true;
      page
        .requestFullscreen({ navigationUI: 'hide' })
        .then(() => lockable()?.lock?.call(screen.orientation, 'landscape'))
        .catch(() => {})
        .finally(() => {
          asking = false;
        });
    };
    const events = ['pointerup', 'touchend', 'click'] as const;
    for (const event of events) window.addEventListener(event, onTap, true);
    return () => {
      for (const event of events) window.removeEventListener(event, onTap, true);
    };
  }, []);
}
