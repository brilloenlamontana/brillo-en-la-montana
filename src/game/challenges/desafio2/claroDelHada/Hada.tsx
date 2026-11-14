import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { LoopOnce, LoopRepeat, Quaternion, Vector3, type AnimationAction, type Group, type Mesh } from 'three';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { lightOrb } from '@/game/engine/rendering/glowMaterials';
import { PROMPT_Z_RANGE } from '@/game/engine/interaction/promptLayer';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { usePlayerStore } from '@/game/player/playerStore';
import { useToastStore } from '@/store/toastStore';
import { isGameplayPaused, useUIStore } from '@/store/uiStore';
import { DESAFIO2_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { useClaroStore } from './claroStore';
import { claroVivo, hadaEscena, hadaViva, type HadaClip } from './hadaViva';
import { HADA_ESPERA, HADA_PEDESTAL, HADA_SUELO } from './lugares';
import { rescateVivo, TALLOS } from './rescate';

const URL = DESAFIO2_MODELS.hada;
const FADE_SECONDS = 0.3;
const UP = new Vector3(0, 1, 0);
// Her glow: a ball of light with no edge (a TSL shader, so it is the same in WebGPU and in WebGL 2).
const GLOW = lightOrb('#ffd76a', '#fffbe0');
// Clips that play once and hold their last pose (the rest loop).
const UNA_VEZ: ReadonlySet<HadaClip> = new Set(['Queja', 'Despegar']);

// Caught on the pedestal she looks at whoever comes within MIRA (m), and toward the trail otherwise. She takes
// whoever arrives for a goblin: curled up in fear (clip Asustada) until they have been near (CERCA) without running
// for a moment. Her trust grows by GANA per second and running takes it away by PIERDE per second.
const MIRA = 14;
const CERCA = 9;
const GANA = 0.6;
const PIERDE = 2.5;
// Calm and with the player this close, she asks for help (once per session).
const PIDE_AYUDA = 6.5;
export const AYUDA = 'Hada: «¡No eres un duende! Ayúdame, por favor: esta trampa aprieta más cada vez que me muevo».';
// Freed, she flutters in a slow, uneven circle over the clearing...
const ORBIT_RADIUS = 2.7;
const ORBIT_SECONDS = 9;
const ORBIT_HEIGHT = 1.5;
// ...and when the player comes this close she flies over and hovers in front of them, at chest height.
const ATTEND_RANGE = 5;
const HOVER_DISTANCE = 1.7;
const HOVER_HEIGHT = 1.15;
const FLY_SPEED = 4;
const TALK_RANGE = 3;
const PROMPT_HEIGHT = 1.15;
// She takes the amulet off the lectern once she hovers this close to her waiting place and its roots are this open.
const ESPERA_CERCA = 0.3;
const RAICES_ABIERTAS = 0.9;

// Starts a clip from its first frame, fading in; one that plays once holds its last pose.
function arrancar(action: AnimationAction, once: boolean) {
  action.reset();
  action.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
  action.clampWhenFinished = true;
  action.fadeIn(FADE_SECONDS).play();
}

type HadaProps = {
  // Her clearing is drawn.
  visible: boolean;
  // Out of the bramble trap: she flies.
  liberada: boolean;
  // Her amulet was given: she lives in the clearing and can be talked to.
  completado: boolean;
  // She can be talked to (the clearing is live and no dialog is open).
  canTalk: boolean;
};

// The fairy of the clearing (Bonus 2). Caught in the brambles she cowers on the pedestal: afraid of whoever comes
// running (clip Asustada), calmer with whoever walks up (Atrapada), wincing when the brambles tighten (Queja). With the
// cage cut open she lies on the ground until she is helped up (Herida). Freed, she waits by the lectern with her
// amulet (Entregar) and, once it is given, flies over the clearing for good (Volar), coming to hover in front of the
// player when they get close, where she can be talked to. While a scene directs her (hadaEscena) she does what it
// says. Her glow travels with her, dimmer when she is afraid or hurt and brighter when she is free.
export function Hada({ visible, liberada, completado, canTalk }: HadaProps) {
  const group = useRef<Group>(null);
  const luz = useRef<Group>(null);
  const { scene, animations } = useGLTF(URL);
  const { actions } = useAnimations(animations, group);
  const [near, setNear] = useState(false);
  const live = useRef({ near: false, freedAt: null as number | null, clip: null as HadaClip | null, luz: 1, pidio: false });
  const work = useMemo(() => ({ target: new Vector3(), step: new Vector3(), facing: new Quaternion(), spin: new Quaternion() }), []);

  // A skinned mesh is posed by its skeleton, so its bounding sphere does not follow the animation: never cull it.
  useLayoutEffect(() => {
    scene.traverse((object) => {
      if ((object as Mesh).isMesh) object.frustumCulled = false;
    });
  }, [scene]);

  useFrame((state, rawDelta) => {
    const hada = group.current;
    if (!hada) return;
    const l = live.current;
    if (!visible) {
      if (l.clip) Object.values(actions).forEach((action) => action?.stop());
      l.clip = null;
      return;
    }
    const delta = Math.min(rawDelta, 0.1);
    const now = state.clock.elapsedTime;
    const p = hadaViva.position;
    const player = usePlayerStore.getState();
    const toPlayer = Math.hypot(player.position.x - p.x, player.position.z - p.z);
    let clip: HadaClip = 'Volar';
    let light = 1;
    let lookX = 0;
    let lookZ = 1;
    let turn = 5;
    let talkable = false;

    if (hadaEscena.activa) {
      // A scene says where she is and what she does.
      p.copy(hadaEscena.position);
      clip = hadaEscena.clip;
      light = hadaEscena.luz;
      lookX = hadaEscena.mira.x - p.x;
      lookZ = hadaEscena.mira.z - p.z;
      turn = 8;
    } else if (!liberada) {
      l.freedAt = null;
      hadaViva.conAmuleto = false;
      if (toPlayer < MIRA) {
        lookX = player.position.x - p.x;
        lookZ = player.position.z - p.z;
      }
      if (rescateVivo.cortados >= TALLOS.length) {
        // The cage is open and she is on the ground, too weak to fly.
        p.set(...HADA_SUELO);
        clip = 'Herida';
        light = 0.6;
      } else {
        p.set(...HADA_PEDESTAL);
        const cutting = useClaroStore.getState().rescate;
        if (cutting) claroVivo.confianza = 1;
        else if (toPlayer < CERCA) claroVivo.confianza = Math.min(1, Math.max(0, claroVivo.confianza + (player.action === 'Running' ? -PIERDE : GANA) * delta));
        clip = cutting?.fase === 'aprieta' ? 'Queja' : claroVivo.confianza < 0.5 ? 'Asustada' : 'Atrapada';
        light = (0.45 + 0.55 * claroVivo.confianza) * (cutting?.fase === 'aprieta' ? 0.5 : 1);
        if (!l.pidio && !cutting && claroVivo.confianza >= 1 && toPlayer < PIDE_AYUDA && !isGameplayPaused()) {
          l.pidio = true;
          useToastStore.getState().showToast(AYUDA);
        }
      }
    } else if (!completado) {
      // Free: she goes to the lectern, takes her amulet once its roots have opened and waits with it.
      const bob = 0.07 * Math.sin(now * 2.6);
      work.target.set(HADA_ESPERA[0], HADA_ESPERA[1] + bob, HADA_ESPERA[2]);
      const step = work.step.copy(work.target).sub(p);
      const distance = step.length();
      if (distance > 1e-3 && !isGameplayPaused()) p.addScaledVector(step, Math.min(distance, FLY_SPEED * delta) / distance);
      if (!hadaViva.conAmuleto && distance < ESPERA_CERCA && claroVivo.raices > RAICES_ABIERTAS) hadaViva.conAmuleto = true;
      clip = hadaViva.conAmuleto ? 'Entregar' : 'Volar';
      if (distance > ESPERA_CERCA) {
        lookX = step.x;
        lookZ = step.z;
      } else if (toPlayer < MIRA) {
        lookX = player.position.x - p.x;
        lookZ = player.position.z - p.z;
      }
      light = 1.2;
    } else {
      l.freedAt ??= now;
      const attending = Math.hypot(player.position.x - HADA_PEDESTAL[0], player.position.z - HADA_PEDESTAL[2]) < ATTEND_RANGE + ORBIT_RADIUS && toPlayer < ATTEND_RANGE + 3;
      const bob = 0.14 * Math.sin(now * 2.6);
      if (attending) {
        // In front of the player, on the side she already is, looking at them.
        const away = work.step.set(p.x - player.position.x, 0, p.z - player.position.z);
        if (away.lengthSq() < 1e-4) away.set(0, 0, 1);
        away.normalize();
        work.target.set(player.position.x + away.x * HOVER_DISTANCE, player.position.y + HOVER_HEIGHT + bob, player.position.z + away.z * HOVER_DISTANCE);
        lookX = player.position.x - p.x;
        lookZ = player.position.z - p.z;
      } else {
        const angle = ((now - l.freedAt) / ORBIT_SECONDS) * Math.PI * 2;
        const radius = ORBIT_RADIUS + 0.7 * Math.sin(now * 0.37);
        work.target.set(HADA_PEDESTAL[0] + Math.cos(angle) * radius, HADA_PEDESTAL[1] + ORBIT_HEIGHT + 0.45 * Math.sin(now * 0.9) + bob, HADA_PEDESTAL[2] + Math.sin(angle) * radius);
        lookX = work.target.x - p.x;
        lookZ = work.target.z - p.z;
      }
      const step = work.step.copy(work.target).sub(p);
      const distance = step.length();
      if (distance > 1e-3 && !isGameplayPaused()) p.addScaledVector(step, Math.min(distance, FLY_SPEED * delta) / distance);
      talkable = canTalk && toPlayer < TALK_RANGE && Math.abs(player.position.y - p.y) < 3;
    }

    // Her clip: the one before fades out as the new one comes in.
    if (clip !== l.clip) {
      const next = actions[clip] ?? actions.Idle;
      if (l.clip) (actions[l.clip] ?? actions.Idle)?.fadeOut(FADE_SECONDS);
      if (next) arrancar(next, UNA_VEZ.has(clip));
      l.clip = clip;
    }

    hada.position.copy(p);
    if (Math.hypot(lookX, lookZ) > 0.05) hadaViva.yaw = Math.atan2(lookX, lookZ);
    work.facing.setFromAxisAngle(UP, hadaViva.yaw);
    if (hadaEscena.activa && hadaEscena.giro) work.facing.multiply(work.spin.setFromAxisAngle(UP, hadaEscena.giro));
    hada.quaternion.slerp(work.facing, Math.min(1, turn * delta));
    l.luz += (light - l.luz) * Math.min(1, 4 * delta);
    luz.current?.scale.setScalar(l.luz);

    if (talkable !== l.near) {
      l.near = talkable;
      setNear(talkable);
    }
  });

  const talk = () => {
    if (useUIStore.getState().dialog === null) useUIStore.getState().openDialog(DIALOG.hada);
  };
  useInteractKey(near, talk);

  return (
    <group ref={group} position={[...HADA_PEDESTAL]} visible={visible}>
      <primitive object={scene} />
      {/* Her light: what was seen flickering from the trail. */}
      <group ref={luz} position={[0, 0.5, 0]}>
        <mesh material={GLOW} renderOrder={2}>
          <sphereGeometry args={[0.3, 24, 16]} />
        </mesh>
      </group>
      {near && (
        <Html zIndexRange={PROMPT_Z_RANGE} position={[0, PROMPT_HEIGHT, 0]} center>
          <InteractionPrompt action="hablar con el hada" onActivate={talk} />
        </Html>
      )}
    </group>
  );
}

useGLTF.preload(URL);
