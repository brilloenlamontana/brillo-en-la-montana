import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { WebGPURenderer } from 'three/webgpu';
import { useAuthStore } from '../store/authStore';
import { useAvatarStore } from '../store/avatarStore';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../components/Logout';
import { Map } from '../components/models-3d/Map';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Avatar } from '../components/models-3d/Avatar';  
import { PlayerController } from '../components/models-3d/PlayerController';
import { Ambience } from '../components/Ambience';
import { MobileControls } from '../components/MobileControls';
import { useIsMobile } from '../hooks/useIsMobile';

export const WorldPage: React.FC = () => {
  const { user } = useAuthStore();
  const { hasSelectedCharacter } = useAvatarStore();
  const navigate = useNavigate();
  const detectedMobile = useIsMobile();
  const [manualControlsToggle, setManualControlsToggle] = useState<boolean | null>(null);

  const showMobileControls = manualControlsToggle !== null ? manualControlsToggle : detectedMobile;

  const keyboardMap = [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
    { name: "rightward", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
    { name: "run", keys: ["Shift"] },
  ];

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!user.acceptedLaw1581) {
      navigate('/login');
    } else if (!hasSelectedCharacter) {
      navigate('/seleccion-personaje');
    }
  }, [user, hasSelectedCharacter, navigate]);

  if (!user || !user.acceptedLaw1581 || !hasSelectedCharacter) return null;

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Quick toggle button for mobile controls (useful for testing on desktop / switching mode) */}
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

      <Canvas 
        camera={{ position: [0, 0, 2] }}
        gl={async (props) => {
          try {
            const renderer = new WebGPURenderer(props as any);
            await renderer.init();
            return renderer;
          } catch (error) {
            console.warn('WebGPU not supported or failed to initialize. Falling back to WebGLRenderer.', error);
            const { WebGLRenderer } = await import('three');
            return new WebGLRenderer(props as any);
          }
        }}
      >
        <Ambience />
        <Suspense fallback={null}>
          <Physics>
            <Map />
            <KeyboardControls map={keyboardMap}>
              <PlayerController>
                <Avatar />
              </PlayerController>
            </KeyboardControls>
          </Physics>
        </Suspense>
      </Canvas>
      
      <Logout />

      {/* Touch Joystick & Virtual Buttons on Mobile */}
      <MobileControls show={showMobileControls} />
    </main>
  );
};
