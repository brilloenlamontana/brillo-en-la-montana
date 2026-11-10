import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { freeze, setNodeVisible } from '@/game/engine/models/sceneUtils';
import { StaticModel, TrimeshColliders } from '@/game/engine/models/StaticModel';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';

const { exterior: EXTERIOR_URL, interior: INTERIOR_URL, recogibles: RECOGIBLES_DIR } = DESAFIO1_MODELS.chozaEstatua;
const ANILLO_URL = `${RECOGIBLES_DIR}/AnilloOro.glb`;
// Module constants: a new array per render would rebuild the trimesh colliders every time.
const CHOZA_COLLIDERS = ['ChozaParedes', 'ChozaBase'] as const;
const ESTATUA_COLLIDERS = ['EstatuaPiedra'] as const;
// The stone statue in the middle of the hut (its feet) and how close the player has to be to tend to it.
const ESTATUA: readonly [number, number, number] = [-62.9, 9.3, -94.1];
const REACH = 2.6;

const examinar = () => useUIStore.getState().openDialog(DIALOG.estatua);

// Bonus 1 — "ChozaEstatua" collection of Map.blend: a half-ruined hut covered in algae at the swamp exit, with a stone
// statue inside ("Acertijo 1" of the scene schedule). Examining the statue opens its dialog (EstatuaDialog), which tells
// the riddle step by step: clean the moss off its face (EstatuaMoho goes away), light a fire on the stone plate at its
// feet (EstatuaFuego appears) and take the gold ring it then holds out in its hands (bono1Completado).
export function ChozaEstatua() {
  const visible = useVisibleFrom(VISIBLE_FROM.choza);
  const warming = useWorldStore((state) => state.warming);
  const limpia = useProgressStore((state) => state.progress.estatuaLimpia);
  const encendida = useProgressStore((state) => state.progress.estatuaEncendida);
  const completado = useProgressStore((state) => state.progress.bono1Completado);
  const { scene } = useGLTF(INTERIOR_URL);

  useLayoutEffect(() => freeze(scene), [scene]);
  useLayoutEffect(() => {
    setNodeVisible(scene, 'EstatuaMoho', !limpia);
    setNodeVisible(scene, 'EstatuaFuego', encendida);
  }, [scene, limpia, encendida]);

  const prompt = completado ? 'contemplar la estatua' : encendida ? 'tomar el anillo de la estatua' : limpia ? 'encender el plato de la estatua' : 'examinar la estatua';

  return (
    <group name="ChozaEstatua">
      <StaticModel url={EXTERIOR_URL} visible={visible} colliders={CHOZA_COLLIDERS} />
      <primitive object={scene} visible={visible} />
      <TrimeshColliders scene={scene} names={ESTATUA_COLLIDERS} />
      {/* The ring rests in the statue's open hands from the fire until it is taken. */}
      <StaticModel url={ANILLO_URL} visible={visible && encendida && !completado} />
      <InteractionSpot position={ESTATUA} radius={REACH} promptHeight={2.7} enabled={visible && !warming} prompt={prompt} onInteract={examinar} />
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERIOR_URL, ANILLO_URL]);
