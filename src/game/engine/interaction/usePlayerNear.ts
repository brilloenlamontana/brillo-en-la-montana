import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { isInZone, type Zone } from '@/game/engine/geometry/zone';
import { usePlayerStore } from '@/game/player/playerStore';

// Whether the player is inside `zone`. Checked every frame, but it only re-renders when the answer changes.
export function usePlayerNear(zone: Zone): boolean {
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);

  useFrame(() => {
    const { x, z } = usePlayerStore.getState().position;
    const next = isInZone(zone, x, z, nearRef.current);
    if (next !== nearRef.current) {
      nearRef.current = next;
      setNear(next);
    }
  });

  return near;
}
