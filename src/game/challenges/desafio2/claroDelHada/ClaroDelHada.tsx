import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AMULETO_HADA, EXTRA_STAR_TOAST, withExtraStar } from '@/game/challenges/bonos';
import { playSfx } from '@/game/engine/audio/audio';
import { Collectibles, type Collectible } from '@/game/engine/interaction/Collectibles';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { setNodeVisible } from '@/game/engine/models/sceneUtils';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { DESAFIO2_MODELS } from '../assets';
import { useBosqueStore } from '../bosqueStore';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';
import { Hada } from './Hada';
import { HADA_PEDESTAL } from './lugares';

const { exterior: EXTERIOR_URL, interactivos: INTERACTIVOS_URL, recogibles: RECOGIBLES_DIR } = DESAFIO2_MODELS.claroDelHada;
const AMULETO: readonly Collectible[] = [{ id: AMULETO_HADA, name: 'Amuleto del hada', url: `${RECOGIBLES_DIR}/AmuletoHada.glb` }];
// Module constant: a new array per render would rebuild the trimesh collider every time.
const CLARO_COLLIDERS = ['ClaroPedestal'] as const;
// The bramble trap wraps the pedestal where the fairy is caught.
const ZARZA: readonly [number, number, number] = [HADA_PEDESTAL[0], 14.6, HADA_PEDESTAL[2] - 0.2];
const ZARZA_REACH = 4;
// The flickering light is noticed from this far (m), once per visit to the forest.
const LIGHT_NOTICED_FROM = 42;

const toast = (message: string) => useToastStore.getState().showToast(message);

// Cutting the brambles: only the elven sword can (it stays with the player even after the goblins are gone).
function cortarZarzas() {
  const { progress } = useProgressStore.getState();
  if (progress.hadaLiberada) return;
  if (!progress.collectedItems.includes('espada')) {
    return toast('Las zarzas son duras como el hierro: solo la espada élfica podría cortarlas. Pídesela al elfo del árbol gigante.');
  }
  useBosqueStore.getState().slash();
  playSfx('d2_zarzas');
  playSfx('d2_hada_libre', { volume: 0.8 });
  saveProgress({ hadaLiberada: true });
  useUIStore.getState().openDialog(DIALOG.hada);
}

function recogerAmuleto(id: string) {
  const { progress } = useProgressStore.getState();
  playSfx('d2_amuleto');
  saveProgress({ collectedItems: [...progress.collectedItems, id], bono2Completado: true, vidasExtra: withExtraStar(progress) });
  useToastStore.getState().showToast(EXTRA_STAR_TOAST);
  useUIStore.getState().openDialog(DIALOG.hadaAmuleto);
}

// Bonus 2 — "ClaroDelHada" collection of Map.blend: a clearing near the forest exit ("Acertijo 2" of the scene
// schedule). A flickering light (HadaLuzLejana) is seen from the exit trail: it is a call for help. In the clearing a
// fairy is caught in a bramble trap (HadaZarzaTrampa); cutting it with the elven sword frees her: she takes off and
// flies over the clearing, thanks the player and offers her amulet, picked up from the root lectern (bono2Completado).
export function ClaroDelHada() {
  const visible = useVisibleFrom(VISIBLE_FROM.claro);
  const warmingHere = useWarmingHere(VISIBLE_FROM.claro);
  const warming = useWorldStore((state) => state.warming);
  const liberada = useProgressStore((state) => state.progress.hadaLiberada);
  const completado = useProgressStore((state) => state.progress.bono2Completado);
  const dialogOpen = useUIStore((state) => state.dialog !== null);
  const { scene, nodes } = useGLTF(INTERACTIVOS_URL);
  const live = useRef({ pulse: 0, noticed: false });

  useLayoutEffect(() => {
    setNodeVisible(scene, 'HadaZarzaTrampa', !liberada);
    setNodeVisible(scene, 'HadaLuzLejana', !liberada);
  }, [scene, liberada]);

  // The distant light flickers while the fairy is trapped; the first time it comes into sight it is pointed out.
  useFrame((_, delta) => {
    if (!visible || liberada || warming) return;
    const l = live.current;
    const luz = nodes.HadaLuzLejana;
    if (luz) {
      l.pulse += delta;
      luz.scale.setScalar(1 + 0.25 * Math.sin(l.pulse * 5) + 0.1 * Math.sin(l.pulse * 13));
    }
    if (l.noticed) return;
    const player = usePlayerStore.getState().position;
    if (Math.hypot(player.x - HADA_PEDESTAL[0], player.z - HADA_PEDESTAL[2]) < LIGHT_NOTICED_FROM) {
      l.noticed = true;
      toast('Entre los árboles parpadea una lucecita a lo lejos. Algo dentro de ti sabe que es un pedido de ayuda: puedes desviarte a buscarla.');
    }
  });

  const active = visible && !warming;

  return (
    <group name="ClaroDelHada">
      <StaticModel url={EXTERIOR_URL} visible={visible} colliders={CLARO_COLLIDERS} />
      <primitive object={scene} visible={visible} />
      {/* She has already said her thanks when freed: she is talked to again once her amulet was taken. */}
      <Hada visible={visible || warmingHere} liberada={liberada} canTalk={active && !dialogOpen && completado} />
      <InteractionSpot
        position={ZARZA}
        radius={ZARZA_REACH}
        promptHeight={2.6}
        enabled={active && !liberada}
        prompt="cortar las zarzas con la espada"
        onInteract={cortarZarzas}
      />
      <group visible={visible && liberada && !completado}>
        <Collectibles items={AMULETO} active={active && liberada} enabled onCollect={recogerAmuleto} />
      </group>
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERACTIVOS_URL, AMULETO[0].url]);
