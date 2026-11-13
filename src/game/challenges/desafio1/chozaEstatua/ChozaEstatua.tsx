import { useLayoutEffect } from 'react';
import { Clone, useGLTF } from '@react-three/drei';
import { useLoopNear } from '@/game/engine/audio/useLoopNear';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { freeze } from '@/game/engine/models/sceneUtils';
import { StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';
import { empezarAnillo } from './anillo';
import { AnilloEscena } from './AnilloEscena';
import { empezarEncendido, PEDERNAL_URL, PIRITA_URL, PLATO } from './encendido';
import { EncendidoEscena } from './EncendidoEscena';
import { empezarLimpieza, enElMundo, TRAPO_SITIO, TRAPO_URL, useChozaStore } from './limpieza';
import { LimpiezaEscena } from './LimpiezaEscena';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL, recogibles: RECOGIBLES_DIR } = DESAFIO1_MODELS.chozaEstatua;
const ANILLO_URL = `${RECOGIBLES_DIR}/AnilloOro.glb`;
// Module constants: a new array per render would rebuild the trimesh colliders every time.
const CHOZA_COLLIDERS = ['ChozaParedes', 'ChozaBase'] as const;
const ESTATUA_COLLIDERS = ['EstatuaPiedra'] as const;
// The stone statue in the middle of the hut (its feet) and how close the player has to be to tend to it.
const ESTATUA: readonly [number, number, number] = [-62.9, 9.3, -94.1];
const REACH = 2.6;

// The two fire stones lie on the floor by the plate, on the side the avatar kneels at, while nobody uses them.
const YESCA = (() => {
  const pedernal = enElMundo([1.24, 0.6]);
  const pirita = enElMundo([1.4, 0.66]);
  return { pedernal: [pedernal.x, 9.29, pedernal.z] as const, pirita: [pirita.x, 9.29, pirita.z] as const };
})();
// The stone plate is solid and taller than a step, lit or not: nobody walks over it or through its fire.
const PLATO_SOLIDO: readonly ColliderBox[] = [{ id: 'choza-plato', position: [PLATO.x, 9.6, PLATO.z], args: [0.38, 0.38, 0.38], rotation: [0, Math.PI / 4, 0] }];
// The fire in the plate, heard from this far (m).
const FUEGO = { x: PLATO.x, y: PLATO.y + 0.3, z: PLATO.z };
const FUEGO_SE_OYE = 13;
const fuegoEncendido = () => (useProgressStore.getState().progress.estatuaEncendida || useChozaStore.getState().encendido?.fase === 'llamas' ? FUEGO : null);

// The first time the statue is examined its dialog tells what it is and what its inscription says; after that E does
// the next thing straight away: clean its face while it is under the moss, then light the fire in the plate, then take
// the ring.
function examinar() {
  const { examinada, setExaminada } = useChozaStore.getState();
  const { estatuaLimpia, estatuaEncendida, bono1Completado } = useProgressStore.getState().progress;
  if (examinada && estatuaEncendida && !bono1Completado) return empezarAnillo();
  if (examinada && estatuaLimpia && !estatuaEncendida) return empezarEncendido();
  if (examinada && !estatuaLimpia) return empezarLimpieza();
  setExaminada();
  useUIStore.getState().openDialog(DIALOG.estatua);
}

// Bonus 1 — "ChozaEstatua" collection of Map.blend: a half-ruined hut covered in algae at the swamp exit, with a stone
// statue inside ("Acertijo 1" of the scene schedule). Examining the statue opens its dialog (EstatuaDialog), which tells
// the riddle step by step: clean the moss off its face by hand (limpieza.ts: the three zones of EstatuaMoho* over the
// face come off one by one), light a fire on the stone plate at its feet striking a flint (encendido.ts: EstatuaFuego
// rises and the moss left on its body, EstatuaMohoCuerpo, burns away) and take the gold ring it then holds out in its
// hands (anillo.ts: the avatar walks up, takes it and lifts it; bono1Completado). The fire stays lit, and is heard,
// from then on.
export function ChozaEstatua() {
  const visible = useVisibleFrom(VISIBLE_FROM.choza);
  const warming = useWorldStore((state) => state.warming);
  const limpia = useProgressStore((state) => state.progress.estatuaLimpia);
  const encendida = useProgressStore((state) => state.progress.estatuaEncendida);
  const completado = useProgressStore((state) => state.progress.bono1Completado);
  const examinada = useChozaStore((state) => state.examinada);
  const limpiando = useChozaStore((state) => state.limpieza !== null);
  const encendiendo = useChozaStore((state) => state.encendido !== null);
  const tomando = useChozaStore((state) => state.anillo !== null);
  // In the avatar's hand from the moment its fingers close on it.
  const anilloEnMano = useChozaStore((state) => state.anillo?.fase === 'alza' || state.anillo?.fase === 'mira');
  // In the avatar's hands from kneeling down until the flames rise.
  const yescaEnMano = useChozaStore((state) => state.encendido !== null && state.encendido.fase !== 'camino' && state.encendido.fase !== 'llamas');
  const { scene } = useGLTF(INTERIOR_URL);
  const { scene: trapo } = useGLTF(TRAPO_URL);
  const { scene: pedernal } = useGLTF(PEDERNAL_URL);
  const { scene: pirita } = useGLTF(PIRITA_URL);

  useLayoutEffect(() => freeze(scene), [scene]);
  // (The moss is shown and taken off by LimpiezaEscena, over the face, and EncendidoEscena, over the body, which also
  // shows the fire.)
  useLoopNear('obj_fogata', fuegoEncendido, FUEGO_SE_OYE, 0.9);

  const prompt = completado
    ? 'contemplar la estatua'
    : encendida
      ? 'tomar el anillo de la estatua'
      : limpia
        ? 'encender el fuego en el plato'
        : examinada
          ? 'limpiar el rostro de la estatua'
          : 'examinar la estatua';

  return (
    <group name="ChozaEstatua">
      <StaticModel url={EXTERIOR_URL} visible={visible} colliders={CHOZA_COLLIDERS} />
      <primitive object={scene} visible={visible} />
      <TrimeshColliders scene={scene} names={ESTATUA_COLLIDERS} />
      <CuboidColliders boxes={PLATO_SOLIDO} />
      {/* The ring rests in the statue's open hands from the fire until it is taken. */}
      <StaticModel url={ANILLO_URL} visible={visible && encendida && !completado && !anilloEnMano} />
      {/* The old rag lies on the slab, to one side of the statue, whenever it is not in the avatar's hand. */}
      <Clone object={trapo} visible={visible && !limpiando} position={TRAPO_SITIO.position} rotation-y={TRAPO_SITIO.yaw} />
      {/* The two fire stones, on the floor by the plate (bigger than in the hand, to be seen from afar). */}
      <Clone object={pedernal} visible={visible && !yescaEnMano} position={YESCA.pedernal} rotation-y={0.7} scale={1.6} />
      <Clone object={pirita} visible={visible && !yescaEnMano} position={YESCA.pirita} rotation-y={-0.5} scale={1.6} />
      {visible && <LimpiezaEscena interior={scene} />}
      {visible && <EncendidoEscena interior={scene} />}
      {visible && <AnilloEscena />}
      <InteractionSpot position={ESTATUA} radius={REACH} promptHeight={2.4} enabled={visible && !warming && !limpiando && !encendiendo && !tomando} prompt={prompt} onInteract={examinar} />
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, ANILLO_URL, TRAPO_URL, PEDERNAL_URL, PIRITA_URL]);
