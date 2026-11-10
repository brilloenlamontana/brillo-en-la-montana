import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { CameraBlockers, StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { loadTerrenoRecuperado } from '@/game/world/recuperado';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { RELATO_CIERRE_MODELS } from '../assets';
import { useCinematicaStore } from '../cinematica/cinematica';
import { isCalizTomado, isSantuarioAbierto } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { Driada } from './Driada';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL, caliz: CALIZ_URL, calizBrillo: CALIZ_BRILLO_URL } = RELATO_CIERRE_MODELS.santuario;
const COLLIDERS = ['SantuarioMuros', 'SantuarioPodio', 'SantuarioTorre', 'SantuarioPuertaMarco'] as const;
const CAMERA_BLOCKERS = ['SantuarioMuros', 'SantuarioTorre'] as const;
// Door leaves, with their origin on the hinge.
const DOOR_LEAVES = ['SantuarioPuertaHojaIzq', 'SantuarioPuertaHojaDer'] as const;
// The wooden altar under the tower (SantuarioAltar) and the chalice standing on it.
const ALTAR: readonly ColliderBox[] = [{ id: 'santuario-altar', position: [163.2, 53.15, -153], args: [0.8, 0.7, 1.6] }];
const CALIZ: readonly [number, number, number] = [163.2, 53.85, -153];
const CALIZ_REACH = 2.4;

// Taking the chalice from the altar ends the game.
function tomarCaliz() {
  if (isCalizTomado(useProgressStore.getState().progress)) return;
  const now = new Date().toISOString();
  usePlayerStore.getState().restoreHealth();
  saveProgress({ calizTomado: true, juegoCompletado: true, juegoCompletadoEn: now });
  // The glow of the chalice travels the whole map (final cinematic); the final victory is told when it ends.
  useCinematicaStore.getState().start();
}

// "Santuario" collection of Map.blend: the sanctuary on the plaza with its tower, spire and green beam. The dryad
// (Driada) comes out of its silver willow double door, locked until she has spoken; then both leaves open when pushed. Inside, under
// the tower, the altar holds the wooden chalice: taking it completes the game (the chalice and its glow go away).
export function Santuario() {
  const { scene, nodes } = useGLTF(EXTERIOR_URL);
  const leaves = useMemo(() => DOOR_LEAVES.flatMap((name) => (nodes[name] ? [nodes[name]] : [])), [nodes]);
  const exteriorVisible = useVisibleFrom(VISIBLE_FROM.cumbre);
  const interiorVisible = useVisibleFrom(VISIBLE_FROM.santuarioInterior);
  const driadaVisible = useVisibleFrom(VISIBLE_FROM.driada);
  const driadaWarming = useWarmingHere(VISIBLE_FROM.driada);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.santuario);
  const warming = useWorldStore((state) => state.warming);
  const abierto = useProgressStore((state) => isSantuarioAbierto(state.progress));
  const tomado = useProgressStore((state) => isCalizTomado(state.progress));

  // The doors are open: the end is near. The green terrain of the recovered world is fetched ahead of time.
  useEffect(() => {
    if (abierto) void loadTerrenoRecuperado().catch(() => undefined);
  }, [abierto]);

  return (
    <group name="Santuario">
      <primitive object={scene} visible={exteriorVisible} />
      {leaves.map((leaf) => (
        <PhysicsDoor key={leaf.name} node={leaf} locked={!abierto} sound="gate" />
      ))}
      <TrimeshColliders scene={scene} names={COLLIDERS} />
      <CameraBlockers scene={scene} names={CAMERA_BLOCKERS} active={cameraActive} />
      <CuboidColliders boxes={ALTAR} />
      <Driada visible={driadaVisible || driadaWarming} />
      <group visible={interiorVisible}>
        <StaticModel url={INTERIOR_URL} merge />
        <group visible={!tomado}>
          <StaticModel url={CALIZ_URL} />
          <StaticModel url={CALIZ_BRILLO_URL} />
        </group>
      </group>
      <InteractionSpot
        position={CALIZ}
        radius={CALIZ_REACH}
        heightRange={[-2.2, 0.5]}
        promptHeight={0.9}
        enabled={interiorVisible && !warming && abierto && !tomado}
        prompt="tomar el cáliz"
        onInteract={tomarCaliz}
      />
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, CALIZ_URL, CALIZ_BRILLO_URL]);
