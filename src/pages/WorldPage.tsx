import React, { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { WebGPURenderer } from 'three/webgpu';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../components/Logout';
import { Map } from '../components/models-3d/Map';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Avatar } from '../components/models-3d/Avatar';  
import { PlayerController } from '../components/models-3d/PlayerController';
import { Ambience } from '../components/Ambience';

export const WorldPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

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
    }
  }, [user, navigate]);

  if (!user) return null;


  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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
    </main>
  );
};
