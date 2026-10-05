import { useCallback, useMemo, useRef, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3 } from 'three';
import { RECOGIBLES, RECOGIBLE_URLS, type RecogibleId } from '../../../../../constants/recogibles';
import { useAvatarStore } from '../../../../../store/avatarStore';
import { useProgressStore } from '../../../../../store/progressStore';
import { saveProgressToDB } from '../../../../../services/progressService';
import { useInteractKey } from '../../../../../hooks/useInteractKey';
import { InteractionPrompt } from '../../../../ui/InteractionPrompt';

// Distancia horizontal desde el borde del objeto hasta el jugador para poder recogerlo.
const PICKUP_RANGE = 1.3;

// Los recogibles están casi juntos sobre la mesa: solo el más cercano al jugador muestra el letrero y responde a E,
// así una pulsación nunca guarda dos objetos a la vez.
export function Recogibles() {
  const gltfs = useGLTF(RECOGIBLE_URLS);
  const collected = useProgressStore((state) => state.progress.collectedItems ?? []);
  const backpackActive = useProgressStore((state) => state.progress.interactedWithImeri === true);

  const items = useMemo(
    () =>
      RECOGIBLES.map((item, i) => {
        const box = new Box3().setFromObject(gltfs[i].scene);
        const size = box.getSize(new Vector3());
        return { ...item, scene: gltfs[i].scene, center: box.getCenter(new Vector3()), radius: Math.max(size.x, size.z) / 2, top: box.max.y };
      }),
    [gltfs],
  );

  const [focusedId, setFocusedId] = useState<RecogibleId | null>(null);
  const focusedRef = useRef<RecogibleId | null>(null);

  useFrame(() => {
    let nearest: RecogibleId | null = null;
    if (backpackActive) {
      const player = useAvatarStore.getState().playerPosition;
      let nearestDistance = PICKUP_RANGE;
      for (const item of items) {
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
    if (!id || collected.includes(id)) return;
    saveProgressToDB(undefined, 'collectedItems', [...collected, id]);
  }, [collected]);

  useInteractKey(focusedId !== null, collectFocused);

  return (
    <>
      {items.map((item) =>
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
