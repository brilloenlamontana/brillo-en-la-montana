import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { ANILLO_ORO } from '@/game/challenges/bonos';
import { playGlide } from '@/game/engine/audio/tones';
import { Collectibles, type Collectible } from '@/game/engine/interaction/Collectibles';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { freeze, setNodeVisible } from '@/game/engine/models/sceneUtils';
import { StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useVisibleFrom } from '@/game/world/visibility';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { DESAFIO1_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL, recogibles: RECOGIBLES_DIR } = DESAFIO1_MODELS.chozaEstatua;
const ANILLO: readonly Collectible[] = [{ id: ANILLO_ORO, name: 'Anillo de oro', url: `${RECOGIBLES_DIR}/AnilloOro.glb` }];
// Module constants: a new array per render would rebuild the trimesh colliders every time.
const CHOZA_COLLIDERS = ['ChozaParedes', 'ChozaBase'] as const;
const ESTATUA_COLLIDERS = ['EstatuaPiedra'] as const;
// The stone statue in the middle of the hut (its feet) and how close the player has to be to tend to it.
const ESTATUA: readonly [number, number, number] = [-62.9, 9.3, -94.1];
const REACH = 2.6;
const INSCRIPCION = '«Limpia mi rostro, enciende mi espíritu»';

const toast = (message: string) => useToastStore.getState().showToast(message);

function limpiarEstatua() {
  if (useProgressStore.getState().progress.estatuaLimpia) return;
  saveProgress({ estatuaLimpia: true });
  toast(`Quitas el moho y la humedad del rostro de la estatua. En su base se lee: ${INSCRIPCION}. A sus pies hay un plato de piedra.`);
}

function encenderFuego() {
  const { progress } = useProgressStore.getState();
  if (!progress.estatuaLimpia || progress.estatuaEncendida) return;
  playGlide(180, 520, 0.7, 0.07, 'triangle');
  saveProgress({ estatuaEncendida: true });
  toast('Enciendes un fuego en el plato: las llamas envuelven la estatua e iluminan la choza. Al bajar el fuego, la estatua abre las manos y te ofrece un anillo de oro.');
}

function recogerAnillo(id: string) {
  const { progress } = useProgressStore.getState();
  playGlide(660, 1320, 0.6, 0.07, 'sine');
  saveProgress({ collectedItems: [...progress.collectedItems, id], bono1Completado: true });
  toast('¡Bono 1 completado! Recibiste el anillo de oro de la estatua: «Ayudo a quienes me mantienen en la luz y el calor».');
}

// Bonus 1 — "ChozaEstatua" collection of Map.blend: a half-ruined hut covered in algae at the swamp exit, with a stone
// statue inside ("Acertijo 1" of the scene schedule). Its inscription says what to do, in order: clean the moss off its
// face (EstatuaMoho goes away), then light a fire on the stone plate at its feet (EstatuaFuego appears); the statue
// then offers a gold ring that can be picked up (bono1Completado).
export function ChozaEstatua() {
  const visible = useVisibleFrom(VISIBLE_FROM.choza);
  const warming = useWorldStore((state) => state.warming);
  const limpia = useProgressStore((state) => state.progress.estatuaLimpia);
  const encendida = useProgressStore((state) => state.progress.estatuaEncendida);
  const { scene } = useGLTF(INTERIOR_URL);

  useLayoutEffect(() => freeze(scene), [scene]);
  useLayoutEffect(() => {
    setNodeVisible(scene, 'EstatuaMoho', !limpia);
    setNodeVisible(scene, 'EstatuaFuego', encendida);
  }, [scene, limpia, encendida]);

  const active = visible && !warming;

  return (
    <group name="ChozaEstatua">
      <StaticModel url={EXTERIOR_URL} visible={visible} colliders={CHOZA_COLLIDERS} />
      <primitive object={scene} visible={visible} />
      <TrimeshColliders scene={scene} names={ESTATUA_COLLIDERS} />
      <InteractionSpot position={ESTATUA} radius={REACH} promptHeight={2.7} enabled={active && !limpia} prompt="leer la inscripción y limpiar el rostro de la estatua" onInteract={limpiarEstatua} />
      <InteractionSpot
        position={ESTATUA}
        radius={REACH}
        promptHeight={2.7}
        enabled={active && limpia && !encendida}
        prompt="encender un fuego en el plato de piedra"
        onInteract={encenderFuego}
      />
      <group visible={visible && encendida}>
        <Collectibles items={ANILLO} active={active && encendida} enabled onCollect={recogerAnillo} />
      </group>
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, ANILLO[0].url]);
