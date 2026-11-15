import { useEffect, useSyncExternalStore } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

const PORTRAIT = '(orientation: portrait)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PORTRAIT);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const isPortrait = () => window.matchMedia(PORTRAIT).matches;

type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'landscape') => Promise<void> };

// On a phone or tablet the game is played with the screen lying on its side. A web page cannot turn the screen by
// itself (only an installed or full-screen page may, and never on iPhone), so while the device is held upright this
// covers everything and asks the player to turn it; where the browser allows it, the screen is also locked sideways.
export function LandscapeOnly() {
  const mobile = useIsMobile();
  const portrait = useSyncExternalStore(subscribe, isPortrait, () => false);

  useEffect(() => {
    if (!mobile) return;
    // Refused almost everywhere outside full screen: the cover below is what always works.
    (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape').catch(() => {});
  }, [mobile]);

  if (!mobile || !portrait) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[#2a1a12] px-8 text-center text-[#f4e4bc] select-none"
      role="alertdialog"
      aria-modal="true"
      aria-label="Gira tu celular para jugar"
    >
      <svg viewBox="0 0 96 96" className="h-28 w-28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {/* The phone upright (faint), the phone on its side (gold) and the turn between them. */}
        <rect x="14" y="10" width="30" height="54" rx="5" className="text-[#8d6e63]" stroke="currentColor" />
        <rect x="34" y="56" width="54" height="30" rx="5" stroke="#f4d03f" fill="#3e2723" />
        <path d="M54 16c14 2 24 12 26 26" stroke="#f4d03f" />
        <path d="M72 38l8 5 5-9" stroke="#f4d03f" />
      </svg>
      <h2 className="font-serif text-2xl font-bold">Gira tu celular</h2>
      <p className="max-w-xs text-sm text-[#e8d09c]">Brillo en la montaña se juega con la pantalla en horizontal. Si no gira, desactiva el bloqueo de rotación de tu celular.</p>
    </div>
  );
}
