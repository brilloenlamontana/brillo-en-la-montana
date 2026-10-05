import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Vector3, type InstancedMesh, type MeshBasicMaterial } from 'three';
import { useAvatarStore } from '../../../../store/avatarStore';
import { useEnemyStore } from '../../../../store/enemyStore';
import { SPRAY_RANGE } from '../../../../utils/mochilaActions';

const PARTICLES = 60;
const DURATION_SECONDS = 1.4;
const SPRAY_HEIGHT = 1.2; // a la altura de las manos de la avatar

type Burst = { start: number; origin: Vector3; directions: Vector3[]; speeds: number[] };

// Nube de insecticida que se expande desde la avatar hasta el alcance del spray y se desvanece.
export function SprayEffect() {
  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const sprayAt = useEnemyStore((state) => state.sprayAt);
  const burst = useRef<Burst | null>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    if (sprayAt === null) return;
    const origin = useAvatarStore.getState().playerPosition.clone();
    origin.y += SPRAY_HEIGHT;
    burst.current = {
      start: sprayAt,
      origin,
      directions: Array.from({ length: PARTICLES }, () =>
        new Vector3(Math.random() * 2 - 1, Math.random() * 0.6 - 0.2, Math.random() * 2 - 1).normalize(),
      ),
      speeds: Array.from({ length: PARTICLES }, () => 0.5 + Math.random() * 0.5),
    };
  }, [sprayAt]);

  useFrame(() => {
    const mesh = meshRef.current;
    const current = burst.current;
    if (!mesh || !materialRef.current) return;
    if (!current) {
      mesh.visible = false;
      return;
    }
    const t = (performance.now() - current.start) / 1000 / DURATION_SECONDS;
    if (t >= 1) {
      burst.current = null;
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const reach = 1 - (1 - t) * (1 - t); // sale rápido y frena al final
    current.directions.forEach((direction, i) => {
      dummy.position.copy(current.origin).addScaledVector(direction, SPRAY_RANGE * current.speeds[i] * reach);
      dummy.scale.setScalar(0.4 + 1.6 * t);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    materialRef.current.opacity = 0.55 * (1 - t);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLES]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[0.25, 8, 6]} />
      <meshBasicMaterial ref={materialRef} color="#a5d66b" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}
