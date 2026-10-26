import React from 'react';
import { Joystick, VirtualButton } from 'ecctrl/input';

interface MobileControlsProps {
  show?: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ show = true }) => {
  if (!show) return null;

  return (
    <div 
      className="mobile-controls-layer pointer-events-none select-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        touchAction: 'none',
      }}
    >
      {/* Movement Virtual Joystick (Left hand) */}
      <div className="pointer-events-auto">
        <Joystick
          id="default"
          joystickMaxRadius={48}
          joystickWrapperStyle={{
            position: 'fixed',
            bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
            left: 'max(24px, env(safe-area-inset-left, 24px))',
            width: '150px',
            height: '150px',
            zIndex: 25,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          joystickBaseStyle={{
            width: '110px',
            height: '110px',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(241, 245, 249, 0.75) 100%)',
            border: '2px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.15), inset 0 0 12px rgba(200, 16, 46, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '50%',
          }}
          joystickKnobStyle={{
            width: '54px',
            height: '54px',
            background: 'radial-gradient(circle at 35% 35%, #EF4444 0%, #C8102E 70%, #86091D 100%)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 16px rgba(200, 16, 46, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Action Buttons (Right hand) */}
      <div className="pointer-events-auto">
        {/* Jump Button */}
        <VirtualButton
          id="jump"
          label="SALTAR"
          buttonWrapperStyle={{
            position: 'fixed',
            bottom: 'max(30px, env(safe-area-inset-bottom, 30px))',
            right: 'max(30px, env(safe-area-inset-right, 30px))',
            width: '72px',
            height: '72px',
            zIndex: 25,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            borderRadius: '50%',
          }}
          buttonCapStyle={{
            width: '60px',
            height: '60px',
            background: 'radial-gradient(circle at 35% 35%, #F87171 0%, #C8102E 70%, #86091D 100%)',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '0 4px 16px rgba(200, 16, 46, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />

        {/* Run / Sprint Button */}
        <VirtualButton
          id="run"
          label="CORRER"
          buttonWrapperStyle={{
            position: 'fixed',
            bottom: 'max(115px, calc(env(safe-area-inset-bottom, 30px) + 85px))',
            right: 'max(38px, env(safe-area-inset-right, 38px))',
            width: '60px',
            height: '60px',
            zIndex: 25,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            borderRadius: '50%',
          }}
          buttonCapStyle={{
            width: '50px',
            height: '50px',
            background: 'radial-gradient(circle at 35% 35%, #FBBF24 0%, #D97706 70%, #92400E 100%)',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
};
