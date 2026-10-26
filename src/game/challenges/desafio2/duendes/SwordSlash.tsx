import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import { usePlayerStore } from '@/game/player/playerStore';
import { useBosqueStore } from '../bosqueStore';
import { SWORD_RANGE } from '../items';

const DURATION_SECONDS = 0.35;
const SLASH_HEIGHT = 1; // at the avatar's waist

// A silver ring that sweeps out to the sword's reach and fades: the swing, until the avatar has sword animations.
export function SwordSlash() {
  const mesh = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const slashAt = useBosqueStore((state) => state.slashAt);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (slashAt !== null) start.current = slashAt;
  }, [slashAt]);

  useFrame(() => {
    if (!mesh.current || !material.current) return;
    const t = start.current === null ? 1 : (performance.now() - start.current) / 1000 / DURATION_SECONDS;
    mesh.current.visible = t < 1;
    if (t >= 1) return;
    const player = usePlayerStore.getState().position;
    mesh.current.position.set(player.x, player.y + SLASH_HEIGHT, player.z);
    mesh.current.scale.setScalar(0.3 + (SWORD_RANGE - 0.3) * (1 - (1 - t) * (1 - t)));
    material.current.opacity = 0.7 * (1 - t);
  });

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} visible={false} frustumCulled={false}>
      <ringGeometry args={[0.85, 1, 48]} />
      <meshBasicMaterial ref={material} color="#e8f1ff" transparent opacity={0.7} depthWrite={false} side={2} />
    </mesh>
  );
}
