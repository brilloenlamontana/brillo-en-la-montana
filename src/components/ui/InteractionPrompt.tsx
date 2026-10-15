import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function InteractionPrompt({ action, onActivate }: { action: string; onActivate: () => void }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="bg-black/80 hover:bg-black text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl whitespace-nowrap select-none border border-white/20 text-xs sm:text-sm font-semibold shadow-xl cursor-pointer active:scale-95 transition-all"
      >
        Toca aquí para <b>{action}</b>
      </button>
    );
  }

  return (
    <div className="bg-black/80 text-white px-3 py-1.5 rounded-lg whitespace-nowrap select-none border border-white/10 text-xs sm:text-sm font-medium shadow-lg pointer-events-none">
      Presiona <b>E</b> para {action}
    </div>
  );
}
