import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AMULETO_HADA } from '@/game/challenges/bonos';
import { playGlide } from '@/game/engine/audio/tones';
import { Collectibles, type Collectible } from '@/game/engine/interaction/Collectibles';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { Npc } from '@/game/engine/interaction/Npc';
import { setNodeVisible } from '@/game/engine/models/sceneUtils';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO2_MODELS } from '../assets';
import { useBosqueStore } from '../bosqueStore';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';

const { exterior: EXTERIOR_URL, interactivos: INTERACTIVOS_URL, recogibles: RECOGIBLES_DIR } = DESAFIO2_MODELS.claroDelHada;
const HADA_URL = DESAFIO2_MODELS.hada;
const AMULETO: readonly Collectible[] = [{ id: AMULETO_HADA, name: 'Amuleto del hada', url: `${RECOGIBLES_DIR}/AmuletoHada.glb` }];
// Module constant: a new array per render would rebuild the trimesh collider every time.
const CLARO_COLLIDERS = ['ClaroPedestal'] as const;
// The fairy stands on the stone pedestal in the middle of the clearing, wrapped by the bramble trap.
const HADA_POSITION: [number, number, number] = [40, 15.63, -230];
const HADA_ROTATION_Y = Math.PI;
const ZARZA: readonly [number, number, number] = [40, 14.6, -230.2];
const ZARZA_REACH = 4;

const toast = (message: string) => useToastStore.getState().showToast(message);

// Cutting the brambles: only the elven sword can (it stays with the player even after the goblins are gone).
function cortarZarzas() {
  const { progress } = useProgressStore.getState();
  if (progress.hadaLiberada) return;
  if (!progress.collectedItems.includes('espada')) {
    return toast('Las zarzas son duras como el hierro: solo la espada élfica podría cortarlas. Pídesela al elfo del árbol gigante.');
  }
  useBosqueStore.getState().slash();
  playGlide(900, 300, 0.35, 0.07, 'triangle');
  saveProgress({ hadaLiberada: true });
  useUIStore.getState().openDialog(DIALOG.hada);
}

function recogerAmuleto(id: string) {
  const { progress } = useProgressStore.getState();
  playGlide(660, 1320, 0.6, 0.07, 'sine');
  saveProgress({ collectedItems: [...progress.collectedItems, id], bono2Completado: true });
  toast('¡Bono 2 completado! Recibiste el amuleto del hada: su luz te acompañará en la cumbre.');
}

// Bonus 2 — "ClaroDelHada" collection of Map.blend: a clearing near the forest exit ("Acertijo 2" of the scene
// schedule). A flickering light (HadaLuzLejana) is seen from the exit trail: it is a call for help. In the clearing a
// fairy is caught in a bramble trap (HadaZarzaTrampa); cutting it with the elven sword frees her, she thanks the
// player and her amulet can be picked up from the root lectern (bono2Completado).
export function ClaroDelHada() {
  const visible = useVisibleFrom(VISIBLE_FROM.claro);
  const warmingHere = useWarmingHere(VISIBLE_FROM.claro);
  const warming = useWorldStore((state) => state.warming);
  const liberada = useProgressStore((state) => state.progress.hadaLiberada);
  const completado = useProgressStore((state) => state.progress.bono2Completado);
  const talking = useDialogOpen(DIALOG.hada);
  const { scene, nodes } = useGLTF(INTERACTIVOS_URL);
  const pulse = useRef(0);

  useLayoutEffect(() => {
    setNodeVisible(scene, 'HadaZarzaTrampa', !liberada);
    setNodeVisible(scene, 'HadaLuzLejana', !completado);
  }, [scene, liberada, completado]);

  // The distant light flickers until the fairy has given her amulet.
  useFrame((_, delta) => {
    const luz = nodes.HadaLuzLejana;
    if (!visible || completado || !luz) return;
    pulse.current += delta;
    luz.scale.setScalar(1 + 0.25 * Math.sin(pulse.current * 5) + 0.1 * Math.sin(pulse.current * 13));
  });

  const active = visible && !warming;

  return (
    <group name="ClaroDelHada">
      <StaticModel url={EXTERIOR_URL} visible={visible} colliders={CLARO_COLLIDERS} />
      <primitive object={scene} visible={visible} />
      <Npc
        url={HADA_URL}
        position={HADA_POSITION}
        rotationY={HADA_ROTATION_Y}
        visible={visible || warmingHere}
        animation={liberada ? 'Idle' : 'Atrapada'}
        talk={{ prompt: 'hablar con el hada', enabled: liberada && !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.hada) }}
      />
      <InteractionSpot
        position={ZARZA}
        radius={ZARZA_REACH}
        promptHeight={2.6}
        enabled={active && !liberada}
        prompt="cortar las zarzas con la espada"
        onInteract={cortarZarzas}
      />
      <group visible={visible && liberada}>
        <Collectibles items={AMULETO} active={active && liberada} enabled onCollect={recogerAmuleto} />
      </group>
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERACTIVOS_URL, HADA_URL, AMULETO[0].url]);
