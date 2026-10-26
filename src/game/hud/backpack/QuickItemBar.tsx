import { useEffect } from 'react';
import { useActiveBackpack } from './useActiveBackpack';

// Bottom-right bar with the carried items: a click, a tap or the item's hotkey uses it. A used-up item disappears from
// it. On phones it rises so it does not cover the jump and run buttons.
export function QuickItemBar({ raised }: { raised: boolean }) {
  const { backpack, progress } = useActiveBackpack();
  const owned = backpack ? backpack.items.filter((item) => backpack.stateOf(item.id, progress) === 'owned') : [];
  const ownedKey = owned.map((item) => item.hotkey).join('');

  useEffect(() => {
    if (!backpack || !ownedKey) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !ownedKey.includes(event.key)) return;
      const item = backpack.items.find((candidate) => candidate.hotkey === event.key);
      if (item) backpack.use(item.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [backpack, ownedKey]);

  if (!backpack || owned.length === 0) return null;

  return (
    <div
      className={`fixed right-[max(16px,env(safe-area-inset-right,16px))] z-30 flex gap-2 sm:gap-2.5 transition-all duration-200 ${
        raised ? 'bottom-[max(180px,calc(env(safe-area-inset-bottom,24px)+150px))]' : 'bottom-[max(16px,env(safe-area-inset-bottom,16px))]'
      }`}
    >
      {owned.map(({ id, name, hotkey, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => backpack.use(id)}
          title={`Usar ${name} (${hotkey})`}
          aria-label={`Usar ${name}`}
          className="relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#f4e4bc]/95 border-2 sm:border-[3px] border-[#5c3a21] shadow-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#f4d03f]"
        >
          <Icon className="w-7 h-7 sm:w-10 sm:h-10" />
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#5c3a21] text-[#f4d03f] text-[10px] sm:text-xs font-bold flex items-center justify-center border sm:border-2 border-[#f4e4bc]"
          >
            {hotkey}
          </span>
        </button>
      ))}
    </div>
  );
}
