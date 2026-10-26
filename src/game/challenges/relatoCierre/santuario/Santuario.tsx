import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CameraBlockers, StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { useVisibleFrom } from '@/game/world/visibility';
import { RELATO_CIERRE_MODELS } from '../assets';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL, caliz: CALIZ_URL, calizBrillo: CALIZ_BRILLO_URL } = RELATO_CIERRE_MODELS.santuario;
const COLLIDERS = ['SantuarioMuros', 'SantuarioPodio', 'SantuarioTorre', 'SantuarioPuertaMarco'] as const;
const CAMERA_BLOCKERS = ['SantuarioMuros', 'SantuarioTorre'] as const;
// Door leaves, with their origin on the hinge.
const DOOR_LEAVES = ['SantuarioPuertaHojaIzq', 'SantuarioPuertaHojaDer'] as const;

// "Santuario" collection of Map.blend: the sanctuary on the plaza with its tower, spire and green glow. Both leaves of
// the silver willow door open when pushed; inside, under the tower, the altar holds the wooden chalice.
export function Santuario() {
  const { scene, nodes } = useGLTF(EXTERIOR_URL);
  const leaves = useMemo(() => DOOR_LEAVES.flatMap((name) => (nodes[name] ? [nodes[name]] : [])), [nodes]);
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.cumbre);
  const interiorVisible = useVisibleFrom(VISIBLE_FROM.santuarioInterior);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.santuario);

  return (
    <group name="Santuario">
      <primitive object={scene} visible={exteriorVisible} />
      {leaves.map((leaf) => (
        <PhysicsDoor key={leaf.name} node={leaf} />
      ))}
      <TrimeshColliders scene={scene} names={COLLIDERS} />
      <CameraBlockers scene={scene} names={CAMERA_BLOCKERS} active={cameraActive} />
      <group visible={interiorVisible}>
        <StaticModel url={INTERIOR_URL} merge />
        <StaticModel url={CALIZ_URL} />
        <StaticModel url={CALIZ_BRILLO_URL} />
      </group>
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, CALIZ_URL, CALIZ_BRILLO_URL]);
