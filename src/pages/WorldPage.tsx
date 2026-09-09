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
    } else if (!hasSelectedCharacter) {
      navigate('/seleccion-personaje');
    }
  }, [user, hasSelectedCharacter, navigate]);

  if (!user || !hasSelectedCharacter) return null;

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Quick toggle button for mobile controls (useful for testing on desktop / switching mode) */}
      <div style={{ position: 'absolute', top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))', left: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))', zIndex: 30 }}>
        <button
          onClick={() => setManualControlsToggle((prev) => (prev === null ? !detectedMobile : !prev))}
          title={showMobileControls ? "Ocultar controles táctiles" : "Mostrar controles táctiles (Joystick)"}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: showMobileControls ? 'rgba(79, 70, 229, 0.4)' : 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: showMobileControls ? '1px solid rgba(129, 140, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            padding: '0.45rem 0.85rem',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            boxShadow: showMobileControls ? '0 2px 10px rgba(99, 102, 241, 0.3)' : 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
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
