import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { VILLA_BOJ_GATE_ZONE } from '../../../../constants/zones';
import { usePlayerNear } from '../../../../hooks/usePlayerNear';

// Cada hoja tiene su origen en la bisagra y viene modelada abierta (±20°); cerrada queda a ±90°, tapando el paso.
const LEAVES = [
  { node: 'PortonHojaDer', closedAngle: -Math.PI / 2 },
  { node: 'PortonHojaIzq', closedAngle: Math.PI / 2 },
] as const;
// Medidas de la hoja en sus coordenadas locales (desde la bisagra): 2.06 m de largo y 3.47 m de alto.
const LEAF_HALF_EXTENTS: [number, number, number] = [1.032, 1.735, 0.098];
const LEAF_CENTER_LOCAL = new Vector3(1.032, 1.785, 0);
const GATE_SPEED = 3;

export function Porton(props: any) {
  const { scene, nodes } = useGLTF('/models-3d/map/VillaBoj/Porton.glb');
  const playerNear = usePlayerNear(VILLA_BOJ_GATE_ZONE);
  const leafBodies = useRef<(RapierRigidBody | null)[]>([]);
  const openness = useRef(0);

  const leaves = useMemo(
    () =>
      LEAVES.map(({ node, closedAngle }) => {
        const object = nodes[node];
        return { object, hinge: object.position.clone(), openAngle: object.rotation.y, closedAngle };
      }),
    [nodes],
  );
  const work = useMemo(() => ({ center: new Vector3(), euler: new Euler(), quaternion: new Quaternion() }), []);

  useFrame((_, delta) => {
    openness.current = MathUtils.damp(openness.current, playerNear ? 1 : 0, GATE_SPEED, delta);
    leaves.forEach((leaf, i) => {
      const angle = MathUtils.lerp(leaf.closedAngle, leaf.openAngle, openness.current);
      leaf.object.rotation.y = angle;
      const body = leafBodies.current[i];
      if (!body) return;
      work.euler.set(0, angle, 0);
      work.quaternion.setFromEuler(work.euler);
      work.center.copy(LEAF_CENTER_LOCAL).applyQuaternion(work.quaternion).add(leaf.hinge);
      body.setNextKinematicTranslation(work.center);
      body.setNextKinematicRotation(work.quaternion);
    });
  });

  return (
    <>
      <primitive object={scene} {...props} />
      {leaves.map((leaf, i) => (
        <RigidBody
          key={leaf.object.name}
          ref={(body) => {
            leafBodies.current[i] = body;
          }}
          type="kinematicPosition"
          colliders={false}
        >
          <CuboidCollider args={LEAF_HALF_EXTENTS} />
        </RigidBody>
      ))}
    </>
  );
}

useGLTF.preload('/models-3d/map/VillaBoj/Porton.glb');
