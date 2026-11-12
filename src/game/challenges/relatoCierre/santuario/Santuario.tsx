import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PointLight } from 'three';
import { useGLTF } from '@react-three/drei';
import { CameraBlockers, StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { loadTerrenoRecuperado } from '@/game/world/recuperado';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { RELATO_CIERRE_MODELS } from '../assets';
import { isCalizTomado, isSantuarioAbierto } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { Driada } from './Driada';
import { useRitualStore } from './ritual';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL, caliz: CALIZ_URL, calizBrillo: CALIZ_BRILLO_URL } = RELATO_CIERRE_MODELS.santuario;
const COLLIDERS = ['SantuarioMuros', 'SantuarioPodio', 'SantuarioTorre', 'SantuarioPuertaMarco'] as const;
const CAMERA_BLOCKERS = ['SantuarioMuros', 'SantuarioTorre'] as const;
// Door leaves, with their origin on the hinge.
const DOOR_LEAVES = ['SantuarioPuertaHojaIzq', 'SantuarioPuertaHojaDer'] as const;
// The wooden altar under the tower (SantuarioAltar) and the chalice standing on it.
const ALTAR: readonly ColliderBox[] = [{ id: 'santuario-altar', position: [163.2, 53.15, -153], args: [0.8, 0.7, 1.6] }];
const CALIZ: readonly [number, number, number] = [163.2, 53.85, -153];

// The light of the chalice when the dryad lays her hand on it: a green burst that settles into a steady glow.
const BURST_SECONDS = 1.6;
function CalizLuz() {
  const light = useRef<PointLight>(null);
  const tomado = useProgressStore((state) => isCalizTomado(state.progress));
  useFrame(() => {
    if (!light.current) return;
    const { encendidoAt } = useRitualStore.getState();
    const since = encendidoAt === null ? Infinity : (performance.now() - encendidoAt) / 1000;
    const burst = since < BURST_SECONDS ? Math.sin((since / BURST_SECONDS) * Math.PI) * 60 : 0;
    light.current.intensity = (tomado ? 6 : 2) + burst;
  });
  return <pointLight ref={light} position={[CALIZ[0], CALIZ[1] + 0.5, CALIZ[2]]} color="#7dff9a" distance={14} decay={1.6} />;
}

// "Santuario" collection of Map.blend: the sanctuary on the plaza with its tower, spire and green beam. The dryad
// (Driada) comes out of its silver willow double door, locked until she has spoken; then both leaves open when pushed. Inside, under
// the tower, the altar holds the wooden chalice. It is never taken: at the end of the scene of ritual.ts the dryad lays
// her hand on it and its light reaches everyone (that completes the game).
export function Santuario() {
  const { scene, nodes } = useGLTF(EXTERIOR_URL);
  const leaves = useMemo(() => DOOR_LEAVES.flatMap((name) => (nodes[name] ? [nodes[name]] : [])), [nodes]);
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.cumbre);
  const interiorVisible = useVisibleFrom(VISIBLE_FROM.santuarioInterior);
  const driadaVisible = useVisibleFrom(VISIBLE_FROM.driada);
  const driadaWarming = useWarmingHere(VISIBLE_FROM.driada);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.santuario);
  const abierto = useProgressStore((state) => isSantuarioAbierto(state.progress));
  // The doors unlock when she is convinced and leads the way in (and stay so once the game is completed).
  const guiando = useRitualStore((state) => state.fase === 'camino' || state.fase === 'toque' || state.fase === 'hecho');

  // The doors are open: the end is near. The green terrain of the recovered world is fetched ahead of time.
  useEffect(() => {
    if (abierto) void loadTerrenoRecuperado().catch(() => undefined);
  }, [abierto]);

  return (
    <group name="Santuario">
      <primitive object={scene} visible={exteriorVisible} />
      {leaves.map((leaf) => (
        <PhysicsDoor key={leaf.name} node={leaf} locked={!abierto && !guiando} sound="gate" />
      ))}
      <TrimeshColliders scene={scene} names={COLLIDERS} />
      <CameraBlockers scene={scene} names={CAMERA_BLOCKERS} active={cameraActive} />
      <CuboidColliders boxes={ALTAR} />
      <Driada visible={driadaVisible || driadaWarming} />
      <group visible={interiorVisible}>
        <StaticModel url={INTERIOR_URL} merge />
        <StaticModel url={CALIZ_URL} />
        <StaticModel url={CALIZ_BRILLO_URL} />
        <CalizLuz />
      </group>
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, CALIZ_URL, CALIZ_BRILLO_URL]);
