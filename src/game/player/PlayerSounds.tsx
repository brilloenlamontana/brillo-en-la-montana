import { useRef } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useButtonStore } from 'ecctrl/input';
import { playSfx } from '@/game/engine/audio/audio';
import { footstepsFor } from '@/game/sound/soundscape';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { isGameplayPaused } from '@/store/uiStore';
import type { Control } from './keyboardMap';
import { usePlayerStore } from './playerStore';

// Ground covered between two footsteps, walking and running (meters).
const STRIDE = { Walking: 0.78, Running: 1.35 } as const;
// Falling faster than this (m/s) means the avatar is in the air; touching down from it sounds a landing.
const FALLING = -3.2;
// A jump of more than this in one frame is a teleport, not a step.
const TELEPORT = 1.5;

// Footsteps on the ground of each region, the push of a jump and the landing. It only listens to the avatar's motion:
// it draws nothing.
export function PlayerSounds() {
  const [, getKeys] = useKeyboardControls<Control>();
  const motion = useRef({ x: 0, y: 0, z: 0, placed: false, walked: 0, verticalSpeed: 0, falling: false, jumpHeld: false });

  useFrame((_, delta) => {
    const player = usePlayerStore.getState();
    const { x, y, z } = player.position;
    const m = motion.current;
    const dx = x - m.x, dy = y - m.y, dz = z - m.z;
    const moved = Math.hypot(dx, dz);
    const teleported = !m.placed || moved > TELEPORT || Math.abs(dy) > TELEPORT;
    m.x = x;
    m.y = y;
    m.z = z;
    m.placed = true;
    if (teleported || delta <= 0) {
      m.verticalSpeed = 0;
      m.falling = false;
      return;
    }
    // Smoothed: the physics step and the frame do not always line up.
    m.verticalSpeed += (dy / delta - m.verticalSpeed) * Math.min(1, delta * 18);

    const alive = player.health > 0;
    // Led by a scripted scene the avatar does not jump, whatever the keys say.
    const jump = alive && !isGameplayPaused() && player.guide === null && (getKeys().jump || Boolean(useButtonStore.getState().buttons['jump']));
    if (jump && !m.jumpHeld && !m.falling) playSfx('jug_salto', { volume: 0.55 });
    m.jumpHeld = jump;

    if (m.verticalSpeed < FALLING) m.falling = true;
    else if (m.falling && m.verticalSpeed > -0.6) {
      m.falling = false;
      m.walked = 0;
      if (alive) playSfx('jug_aterrizaje', { volume: 0.7 });
    }

    if (!alive || player.action === 'Idle' || player.action === 'Death' || m.falling || Math.abs(m.verticalSpeed) > 2.6) return;
    m.walked += moved;
    const running = moved / delta > 3.4;
    if (m.walked < (running ? STRIDE.Running : STRIDE.Walking)) return;
    m.walked = 0;
    const { region, interior } = useZoneStore.getState();
    const recovered = useProgressStore.getState().progress.juegoCompletado === true;
    playSfx(footstepsFor(region, interior, recovered), { volume: running ? 0.6 : 0.42, rate: 0.93 + Math.random() * 0.14 });
  });

  return null;
}
