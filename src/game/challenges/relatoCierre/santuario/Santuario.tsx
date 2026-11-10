import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { playGlide } from '@/game/engine/audio/tones';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { Npc } from '@/game/engine/interaction/Npc';
import { CameraBlockers, StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { RELATO_CIERRE_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { isCalizTomado, isSantuarioAbierto } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL, caliz: CALIZ_URL, calizBrillo: CALIZ_BRILLO_URL } = RELATO_CIERRE_MODELS.santuario;
const DRIADA_URL = RELATO_CIERRE_MODELS.driada;
const COLLIDERS = ['SantuarioMuros', 'SantuarioPodio', 'SantuarioTorre', 'SantuarioPuertaMarco'] as const;
const CAMERA_BLOCKERS = ['SantuarioMuros', 'SantuarioTorre'] as const;
// Door leaves, with their origin on the hinge.
const DOOR_LEAVES = ['SantuarioPuertaHojaIzq', 'SantuarioPuertaHojaDer'] as const;
// The dryad waits on the plaza at the foot of the sanctuary steps, beside the double door (ground at 51.85), looking at
// whoever comes up the avenue.
const DRIADA_POSITION: [number, number, number] = [149.7, 51.86, -150.2];
const DRIADA_ROTATION_Y = -1.25;
// The wooden altar under the tower (SantuarioAltar) and the chalice standing on it.
const ALTAR: readonly ColliderBox[] = [{ id: 'santuario-altar', position: [163.2, 53.15, -153], args: [0.8, 0.7, 1.6] }];
const CALIZ: readonly [number, number, number] = [163.2, 53.85, -153];
const CALIZ_REACH = 2.4;

// Taking the chalice from the altar ends the game: the final victory is told.
function tomarCaliz() {
  if (isCalizTomado(useProgressStore.getState().progress)) return;
  const now = new Date().toISOString();
  usePlayerStore.getState().restoreHealth();
  playGlide(440, 1320, 1.2, 0.08, 'sine');
  saveProgress({ calizTomado: true, juegoCompletado: true, juegoCompletadoEn: now });
  useUIStore.getState().openDialog(DIALOG.victoria);
}

// "Santuario" collection of Map.blend: the sanctuary on the plaza with its tower, spire and green beam. The dryad
// waits at its silver willow double door, locked until she has spoken; then both leaves open when pushed. Inside, under
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
  const talking = useDialogOpen(DIALOG.driada);

  return (
    <group name="Santuario">
      <primitive object={scene} visible={exteriorVisible} />
      {leaves.map((leaf) => (
        <PhysicsDoor key={leaf.name} node={leaf} locked={!abierto} />
      ))}
      <TrimeshColliders scene={scene} names={COLLIDERS} />
      <CameraBlockers scene={scene} names={CAMERA_BLOCKERS} active={cameraActive} />
      <CuboidColliders boxes={ALTAR} />
      <Npc
        url={DRIADA_URL}
        position={DRIADA_POSITION}
        rotationY={DRIADA_ROTATION_Y}
        visible={driadaVisible || driadaWarming}
        animation={talking ? 'Talking' : 'Idle'}
        talk={{ prompt: 'hablar con la dríada', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.driada) }}
      />
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

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, CALIZ_URL, CALIZ_BRILLO_URL, DRIADA_URL]);
