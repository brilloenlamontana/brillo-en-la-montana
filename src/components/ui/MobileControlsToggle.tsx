import React from 'react';

interface MobileControlsToggleProps {
  showMobileControls: boolean;
  detectedMobile: boolean;
  setManualControlsToggle: React.Dispatch<React.SetStateAction<boolean | null>>;
}

export const MobileControlsToggle: React.FC<MobileControlsToggleProps> = ({ 
  showMobileControls, 
  detectedMobile, 
  setManualControlsToggle 
}) => {
  return (
    <div className="absolute top-[max(3.5rem,calc(env(safe-area-inset-top,12px)+2.75rem))] left-[max(12px,env(safe-area-inset-left,12px))] z-30 select-none">
      <button
        type="button"
        onClick={() => setManualControlsToggle((prev) => (prev === null ? !detectedMobile : !prev))}
        title={showMobileControls ? "Ocultar controles táctiles" : "Mostrar controles táctiles (Joystick)"}
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
          showMobileControls
            ? 'bg-gradient-to-r from-[#C8102E] to-[#E53E3E] text-white border-[#A80D26] shadow-red-500/25'
            : 'bg-white/90 hover:bg-white text-slate-700 border-slate-200/90'
        }`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span className="tracking-wide text-[11px] sm:text-xs">
          {showMobileControls ? 'Joystick: ON' : 'Joystick: OFF'}
        </span>
      </button>
    </div>
  );
};
