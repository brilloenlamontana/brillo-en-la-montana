import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { BackpackIcon } from './BackpackIcon';
import { BackpackPanel } from './BackpackPanel';
import { useActiveBackpack } from './useActiveBackpack';

// Next to the profile button once a challenge activates its backpack. The B key toggles it (handy to use the rope
// when trapped in a well).
export function BackpackButton() {
  const { backpack, progress } = useActiveBackpack();
  const open = useUIStore((state) => state.backpackOpen);
  const setOpen = useUIStore((state) => state.setBackpackOpen);
  const active = backpack !== undefined;

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'b') return;
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
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
      >
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
      <div className="w-px h-5 bg-slate-200" />
      {open && <BackpackPanel backpack={backpack} progress={progress} onClose={() => setOpen(false)} />}
    </>
  );
}
