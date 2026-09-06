import React, { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
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
import { CharacterSelectionScreen } from '../components/CharacterSelectionScreen';

export const WorldPage: React.FC = () => {
  const { user } = useAuthStore();
  const { hasSelectedCharacter } = useAvatarStore();
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

  if (!hasSelectedCharacter) {
    return <CharacterSelectionScreen />;
  }

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas>
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
