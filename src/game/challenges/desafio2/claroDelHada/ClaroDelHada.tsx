import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { playSfxAt } from '@/game/engine/audio/spatial';
import { InteractionSpot } from '@/game/engine/interaction/InteractionSpot';
import { setNodeVisible } from '@/game/engine/models/sceneUtils';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { DESAFIO2_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';
import { ClaroEscena } from './ClaroEscena';
import { useClaroStore } from './claroStore';
import { empezarEntrega } from './entrega';
import { Hada } from './Hada';
import { ATRIL, HADA_PEDESTAL, HADA_SUELO } from './lugares';
import { RescateEscena } from './RescateEscena';
import { empezarRescate, rescateVivo, TALLOS } from './rescate';

const { exterior: EXTERIOR_URL, interactivos: INTERACTIVOS_URL, recogibles: RECOGIBLES_DIR } = DESAFIO2_MODELS.claroDelHada;
const AMULETO_URL = `${RECOGIBLES_DIR}/AmuletoHada.glb`;
// Module constant: a new array per render would rebuild the trimesh collider every time.
const CLARO_COLLIDERS = ['ClaroPedestal'] as const;
// The bramble trap wraps the pedestal where the fairy is caught.
const ZARZA: readonly [number, number, number] = [HADA_PEDESTAL[0], 14.6, HADA_PEDESTAL[2] - 0.2];
const ZARZA_REACH = 4;
// She waits with her amulet by the lectern: it is received from this close to it (m).
const ATRIL_REACH = 3.2;
// The flickering light is noticed from this far (m), once per visit to the forest.
const LIGHT_NOTICED_FROM = 42;
// Her call for help: three short flashes and a pause, every LLAMADA seconds; a chime goes with every other call,
// heard from CAMPANA_ALCANCE (m).
const LLAMADA = 2.6;
const DESTELLO = 0.32;
const CAMPANA_ALCANCE = 34;
export const SIN_ESPADA = 'Hada: «Estas zarzas son duras como el hierro. Solo una hoja élfica puede con ellas: pídesela al elfo del árbol gigante».';

const toast = (message: string) => useToastStore.getState().showToast(message);

// Cutting the brambles: only the elven sword can (it stays with the player even after the goblins are gone). With it,
// the avatar goes to cut the three stalks of the trap one by one (see rescate.ts); once they are cut, it goes to help
// the fairy up instead (auxilio.ts).
function cortarZarzas() {
  const { progress } = useProgressStore.getState();
  if (progress.hadaLiberada) return;
  if (!progress.collectedItems.includes('espada')) return toast(SIN_ESPADA);
  empezarRescate();
}

// Bonus 2 — "ClaroDelHada" collection of Map.blend: a clearing near the forest exit ("Acertijo 2" of the scene
// schedule). A light that blinks like a call (HadaLuzLejana) is seen from the exit trail, and fireflies lead to it. In
// the clearing a fairy is caught in a bramble trap (three stalks: ZarzaTallo/Nudo/Tocon A, B, C). The player cuts them
// with the elven sword, each at the moment its knot glows (RescateEscena); helps her up, holding her hand until she
// can fly, and watches the clearing wake as she takes off; and kneels by the root lectern to have her amulet hung on
// their neck (ClaroEscena), which completes the bonus (bono2Completado).
export function ClaroDelHada() {
  const visible = useVisibleFrom(VISIBLE_FROM.claro);
  const warmingHere = useWarmingHere(VISIBLE_FROM.claro);
  const warming = useWorldStore((state) => state.warming);
  const liberada = useProgressStore((state) => state.progress.hadaLiberada);
  const completado = useProgressStore((state) => state.progress.bono2Completado);
  const dialogOpen = useUIStore((state) => state.dialog !== null);
  const enEscena = useClaroStore((state) => state.rescate !== null || state.auxilio !== null || state.entrega !== null);
  const { scene, nodes } = useGLTF(INTERACTIVOS_URL);
  const live = useRef({ pulse: 0, call: -1, noticed: false });

  useLayoutEffect(() => {
    setNodeVisible(scene, 'HadaLuzLejana', !liberada);
  }, [scene, liberada]);

  // The distant light calls for help while the fairy is trapped; the first time it comes into sight it is pointed out.
  useFrame((_, delta) => {
    if (!visible || liberada || warming) return;
    const l = live.current;
    const luz = nodes.HadaLuzLejana;
    l.pulse += delta;
    const call = Math.floor(l.pulse / LLAMADA);
    const within = l.pulse - call * LLAMADA;
    if (luz) {
      // Three flashes, DESTELLO seconds apart, each fading quickly; dim in the pause.
      const flash = within < DESTELLO * 3 ? Math.max(0, 1 - ((within % DESTELLO) / DESTELLO) * 1.6) : 0;
      luz.scale.setScalar(0.6 + 0.9 * flash + 0.05 * Math.sin(l.pulse * 13));
    }
    if (call !== l.call) {
      l.call = call;
      const { rescate, auxilio } = useClaroStore.getState();
      if (call % 2 === 0 && !rescate && !auxilio) playSfxAt('d2_hada_auxilio', { x: HADA_PEDESTAL[0], y: HADA_PEDESTAL[1] + 1, z: HADA_PEDESTAL[2] }, CAMPANA_ALCANCE, 0.6);
    }
    if (l.noticed) return;
    const player = usePlayerStore.getState().position;
    if (Math.hypot(player.x - HADA_PEDESTAL[0], player.z - HADA_PEDESTAL[2]) < LIGHT_NOTICED_FROM) {
      l.noticed = true;
      toast('Entre los árboles parpadea una lucecita a lo lejos. Algo dentro de ti sabe que es un pedido de ayuda: puedes desviarte a buscarla.');
    }
  });

  const active = visible && !warming;
  const libre = active && !enEscena && !dialogOpen;
  // With the three stalks cut (in this session) she is on the ground: what is left is helping her up. It only changes
  // within a scene, and the end of every scene renders this again.
  const jaulaAbierta = rescateVivo.cortados >= TALLOS.length;

  return (
    <group name="ClaroDelHada">
      <StaticModel url={EXTERIOR_URL} visible={visible} colliders={CLARO_COLLIDERS} />
      <primitive object={scene} visible={visible} />
      <RescateEscena model={scene} visible={visible} />
      <ClaroEscena model={scene} amuletoUrl={AMULETO_URL} visible={visible} />
      <Hada visible={visible || warmingHere} liberada={liberada} completado={completado} canTalk={libre && completado} />
      <InteractionSpot position={ZARZA} radius={ZARZA_REACH} promptHeight={2.6} enabled={libre && !liberada && !jaulaAbierta} prompt="cortar las zarzas con la espada" onInteract={cortarZarzas} />
      <InteractionSpot position={HADA_SUELO} radius={2.4} promptHeight={1.2} enabled={libre && !liberada && jaulaAbierta} prompt="ayudar al hada" onInteract={cortarZarzas} />
      <InteractionSpot position={ATRIL} radius={ATRIL_REACH} heightRange={[-2.5, 1.5]} promptHeight={1} enabled={libre && liberada && !completado} prompt="recibir el amuleto del hada" onInteract={empezarEntrega} />
    </group>
  );
}

useGLTF.preload([EXTERIOR_URL, INTERACTIVOS_URL, AMULETO_URL]);
