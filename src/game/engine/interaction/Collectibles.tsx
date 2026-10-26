import { useCallback, useMemo, useRef, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3 } from 'three';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { InteractionPrompt } from './InteractionPrompt';
import { useInteractKey } from './useInteractKey';

// An item lying in the world: a GLB already placed in world coordinates.
export type Collectible = { readonly id: string; readonly name: string; readonly url: string };

// Horizontal distance from the item's edge to the player to pick it up.
const PICKUP_RANGE = 1.3;

type CollectiblesProps = {
  items: readonly Collectible[];
  // The items are in view (their room is drawn).
  active: boolean;
  // They can be picked up (e.g. the owner of the house already offered help).
  enabled: boolean;
  // Records the pickup; collected ids (progress.collectedItems) are no longer drawn.
  onCollect: (id: string) => void;
};

// Items close together: only the one nearest to the player shows the prompt and answers E or a tap, so one press never
// picks up two.
export function Collectibles({ items, active, enabled, onCollect }: CollectiblesProps) {
  const gltfs = useGLTF(items.map((item) => item.url));
  const collected = useProgressStore((state) => state.progress.collectedItems);

  const placed = useMemo(
    () =>
      items.map((item, i) => {
        const box = new Box3().setFromObject(gltfs[i].scene);
        const size = box.getSize(new Vector3());
        return { ...item, scene: gltfs[i].scene, center: box.getCenter(new Vector3()), radius: Math.max(size.x, size.z) / 2, top: box.max.y };
      }),
    [gltfs, items],
  );

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusedRef = useRef<string | null>(null);

  useFrame(() => {
    let nearest: string | null = null;
    if (active && enabled) {
      const player = usePlayerStore.getState().position;
      let nearestDistance = PICKUP_RANGE;
      for (const item of placed) {
        if (collected.includes(item.id)) continue;
        const heightAboveFeet = item.center.y - player.y;
        if (heightAboveFeet < -0.5 || heightAboveFeet > 2.2) continue;
        const distance = Math.hypot(item.center.x - player.x, item.center.z - player.z) - item.radius;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = item.id;
        }
      }
    }
    if (nearest !== focusedRef.current) {
      focusedRef.current = nearest;
      setFocusedId(nearest);
    }
  });

  const collectFocused = useCallback(() => {
    const id = focusedRef.current;
    if (id && !collected.includes(id)) onCollect(id);
  }, [collected, onCollect]);

  useInteractKey(focusedId !== null, collectFocused);

  return (
    <>
      {placed.map((item) =>
        collected.includes(item.id) ? null : (
          <group
            key={item.id}
            onClick={(event) => {
              if (focusedRef.current !== item.id) return;
              event.stopPropagation();
              collectFocused();
            }}
          >
            <primitive object={item.scene} />
            {focusedId === item.id && (
              <Html position={[item.center.x, item.top + 0.35, item.center.z]} center>
                <InteractionPrompt action={`recoger: ${item.name}`} onActivate={collectFocused} />
              </Html>
            )}
          </group>
        ),
      )}
    </>
  );
}
