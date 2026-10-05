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
    <div style={{ position: 'absolute', top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))', left: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))', zIndex: 30 }}>
      <button
        type="button"
        onClick={() => setManualControlsToggle((prev) => (prev === null ? !detectedMobile : !prev))}
        title={showMobileControls ? "Ocultar controles táctiles" : "Mostrar controles táctiles (Joystick)"}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: showMobileControls ? 'linear-gradient(135deg, #C8102E 0%, #E53E3E 100%)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: showMobileControls ? '1px solid #A80D26' : '1px solid rgba(226, 232, 240, 0.9)',
          color: showMobileControls ? '#FFFFFF' : '#334155',
          padding: '0.45rem 0.85rem',
          borderRadius: '9999px',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          boxShadow: showMobileControls ? '0 4px 14px rgba(200, 16, 46, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
        className="hover:scale-105 active:scale-95 select-none"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span style={{ letterSpacing: '0.02em' }}>
          {showMobileControls ? 'Joystick: ON' : 'Joystick: OFF'}
        </span>
      </button>
    </div>
  );
};
