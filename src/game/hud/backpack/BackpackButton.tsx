import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { BackpackIcon } from './BackpackIcon';
import { BackpackPanel } from './BackpackPanel';
import { useActiveBackpack } from './useActiveBackpack';

// Remembered on this device: the player already opened the backpack after picking something up.
const SEEN_KEY = 'brillo.mochilaVista';
const wasSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
};

// Next to the profile button once a challenge activates its backpack. The B key toggles it (handy to use the rope
// when trapped in a well). The first time the player picks something up the button lights up, with a line that says
// what it is, until they open it: that is how they learn that what they pick up is kept (and explained) there.
export function BackpackButton() {
  const { backpack, progress } = useActiveBackpack();
  const open = useUIStore((state) => state.backpackOpen);
  const setOpen = useUIStore((state) => state.setBackpackOpen);
  const active = backpack !== undefined;
  const [lit, setLit] = useState(false);

  // Listens to the stores: something was picked up (and the backpack was never opened after a pickup), or the backpack
  // was opened.
  useEffect(() => {
    const offProgress = useProgressStore.subscribe((state, previous) => {
      if (state.progress.collectedItems.length > previous.progress.collectedItems.length && !wasSeen()) setLit(true);
    });
    const offUI = useUIStore.subscribe((state, previous) => {
      if (!state.backpackOpen || previous.backpackOpen) return;
      setLit(false);
      try {
        localStorage.setItem(SEEN_KEY, '1');
      } catch {
        // Private browsing: it lights up again on the next visit.
      }
    });
    return () => {
      offProgress();
      offUI();
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'b') return;
      // A scripted scene has the avatar (the arm wrestling with the Ogre): the backpack stays shut.
      if (usePlayerStore.getState().guide !== null) return;
      const ui = useUIStore.getState();
      ui.setBackpackOpen(!ui.backpackOpen);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  if (!backpack) return null;
  const ownedCount = backpack.items.filter((item) => backpack.stateOf(item.id, progress) === 'owned').length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Abrir mochila (B)"
        aria-label={`Abrir mochila (${ownedCount} de ${backpack.items.length} objetos)`}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] ${
          lit ? 'ring-4 ring-[#f4d03f] shadow-[0_0_18px_6px_rgba(244,208,63,0.9)] bg-[#f4d03f]/40' : ''
        }`}
      >
        {lit && <span className="absolute inset-0 rounded-full bg-[#f4d03f]/60 animate-ping pointer-events-none" aria-hidden="true" />}
        <BackpackIcon className="w-7 h-7" />
        {ownedCount > 0 && (
          <span
            className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#5c3a21] border-2 border-white text-[9px] leading-none font-bold text-[#f4d03f] flex items-center justify-center"
            aria-hidden="true"
          >
            {ownedCount}
          </span>
        )}
      </button>
      {lit && (
        <span role="status" className="absolute top-full right-0 mt-2 w-max max-w-[70vw] rounded-lg border-2 border-[#5c3a21] bg-[#f4e4bc] px-3 py-1.5 font-serif text-xs sm:text-sm font-bold text-[#3e2723] shadow-xl pointer-events-none">
          Lo que recoges queda en tu mochila: ábrela aquí{' '}
          <span className="font-sans">(B)</span>
        </span>
      )}
      <div className="w-px h-5 bg-slate-200" />
      {open && <BackpackPanel backpack={backpack} progress={progress} onClose={() => setOpen(false)} />}
    </>
  );
}
