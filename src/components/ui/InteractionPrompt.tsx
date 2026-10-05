import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

const PROMPT_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.7)',
  color: 'white',
  padding: '6px 12px',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  border: 'none',
  fontSize: '1rem',
};

// Letrero sobre un objeto 3D (dentro de un <Html> de drei): en computador indica la tecla E, en celular es un botón.
export function InteractionPrompt({ action, onActivate }: { action: string; onActivate: () => void }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <button type="button" onClick={onActivate} style={{ ...PROMPT_STYLE, cursor: 'pointer' }}>
        Toca aquí para <b>{action}</b>
      </button>
    );
  }

  return (
    <div style={{ ...PROMPT_STYLE, pointerEvents: 'none' }}>
      Presiona <b>E</b> para {action}
    </div>
  );
}
