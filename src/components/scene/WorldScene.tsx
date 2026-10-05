import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import { Ambience } from '../environment/Ambience';
import { Map } from '../models-3d/map/Map';
import { Npcs } from '../models-3d/npcs/Npcs';
import { Enemies } from '../models-3d/enemies/Enemies';
import { Objects } from '../models-3d/objects/Objects';
import { Avatar } from '../models-3d/avatar/Avatar';
import { PlayerController } from '../models-3d/avatar/PlayerController';
import { KEYBOARD_MAP } from '../../constants/keyboardMap';
import { createWebGPURenderer } from '../../utils/webgpuRenderer';

export const WorldScene: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 2] }}
      gl={createWebGPURenderer}
    >
      <Ambience />
      <Suspense fallback={null}>
        <Physics debug>
          <Map />
          <Npcs />
          <Enemies />
          <Objects />
          <KeyboardControls map={KEYBOARD_MAP}>
            <PlayerController>
              <Avatar />
            </PlayerController>
          </KeyboardControls>
        </Physics>
      </Suspense>
    </Canvas>
  );
};
