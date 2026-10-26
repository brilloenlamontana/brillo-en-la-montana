import { Suspense } from 'react';
import { KeyboardControls } from '@react-three/drei';
import { Avatar } from './Avatar';
import { KEYBOARD_MAP } from './keyboardMap';
import { PlayerController } from './PlayerController';
import type { Point, Spawn } from './playerStore';

type PlayerProps = {
  // Where the avatar appears when the world opens.
  start?: Spawn;
  onRespawn?: () => Point;
};

// The player: controls, physics capsule, camera and the chosen character. The avatar has its own Suspense so changing
// the character from the profile only reloads the avatar, not the whole world.
export function Player({ start, onRespawn }: PlayerProps) {
  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <PlayerController start={start} onRespawn={onRespawn}>
        <Suspense fallback={null}>
          <Avatar />
        </Suspense>
      </PlayerController>
    </KeyboardControls>
  );
}
