import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAvatarStore } from '../store/avatarStore';
import type { Zone } from '../constants/zones';

// Solo provoca un re-render cuando el jugador entra o sale de la zona.
export function usePlayerNear({ center, enterRadius, exitRadius }: Zone): boolean {
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);

  useFrame(() => {
    const { x, z } = useAvatarStore.getState().playerPosition;
    const distance = Math.hypot(x - center[0], z - center[1]);
    const next = nearRef.current ? distance < exitRadius : distance < enterRadius;
    if (next !== nearRef.current) {
      nearRef.current = next;
      setNear(next);
    }
  });

  return near;
}
