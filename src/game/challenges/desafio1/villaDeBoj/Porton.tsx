import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Euler, MathUtils } from 'three';
import { restPose } from '@/game/engine/models/sceneUtils';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { DESAFIO1_MODELS } from '../assets';

const PORTON_URL = DESAFIO1_MODELS.villaDeBoj.porton;

// Each leaf has its origin on the hinge and is modeled open (+-20 deg); closed it sits at +-90 deg blocking passage.
const LEAVES = [
  { node: 'PortonHojaDer', closedAngle: -Math.PI / 2 },
  { node: 'PortonHojaIzq', closedAngle: Math.PI / 2 },
] as const;
const OPEN_ANGLE = MathUtils.degToRad(75);

// Villa Boj gate: starts closed and the character opens it by pushing each leaf.
export function Porton() {
  const { scene, nodes } = useGLTF(PORTON_URL);
  const leaves = useMemo(
    () =>
      LEAVES.map(({ node, closedAngle }) => ({
        object: nodes[node],
        closedTurn: closedAngle - new Euler().setFromQuaternion(restPose(nodes[node]).quaternion).y,
      })),
    [nodes],
  );

  return (
    <>
      <primitive object={scene} />
      {leaves.map(({ object, closedTurn }) => (
        <PhysicsDoor key={object.name} node={object} closedTurn={closedTurn} openAngle={OPEN_ANGLE} />
      ))}
    </>
  );
}

useGLTF.preload(PORTON_URL);
