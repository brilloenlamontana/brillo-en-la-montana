import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRapier, type RapierCollider } from '@react-three/rapier';
import { Color, MathUtils, Quaternion, Vector3, type Group, type Mesh, type MeshStandardMaterial, type Object3D, type SkinnedMesh } from 'three';
import { playGlide } from '@/game/engine/audio/tones';
import { isBodyNamed, PLAYER_BODY_NAME } from '@/game/engine/physics/bodies';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { isGameplayPaused } from '@/store/uiStore';
import { DESAFIO3_MODELS } from '../assets';
import { CAMARA_SIMONA } from '../lugares';
import { isEspectroCalmado } from '../mission';
import { useTunelStore } from '../tunelStore';
import { VISIBLE_FROM } from '../visibility';

const { ninaFantasma: FANTASMA_URL, ninaClara: CLARA_URL } = DESAFIO3_MODELS;
const UP = new Vector3(0, 1, 0);
const FADE_SECONDS = 0.3;

// It notices the player this close (m, through the rock) and from then on follows them through the whole maze, a
// little slower than a walk: standing still or getting lost is what lets it catch up.
const AWARE_RANGE = 26;
const CHASE_SPEED = 2.5;
const RETURN_SPEED = 4;
// It floats this high over the floor and stops just short of the player.
const HOVER = 0.25;
const KEEP_DISTANCE = 0.9;
// Its touch drains health every HIT_SECONDS while it is this close.
const HIT_RANGE = 1.5;
const HIT_DAMAGE = 7;
const HIT_SECONDS = 1.3;
// The cold on the screen starts this far away.
const COLD_RANGE = 12;
const WARNING_SECONDS = 9;

// The girl says goodbye: she rejoices where she stands, then walks away while she fades.
const JOY_SECONDS = 2.8;
const FADE_OUT_SECONDS = 4.5;
const WALK_SPEED = 0.9;
const DOWN = { x: 0, y: -1, z: 0 };
// The floor she walks on: anything solid except the player.
const isFloor = (collider: RapierCollider) => !collider.isSensor() && !isBodyNamed(collider.parent()?.userData, PLAYER_BODY_NAME);

// Every material of the model replaced by its own copy, so it can be made translucent without touching the cache.
function ownMaterials(root: Object3D, tweak: (material: MeshStandardMaterial) => void): MeshStandardMaterial[] {
  const materials: MeshStandardMaterial[] = [];
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    if ((mesh as SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
    if (!mesh.userData.ownMaterial) {
      mesh.material = (mesh.material as MeshStandardMaterial).clone();
      mesh.userData.ownMaterial = true;
    }
    const material = mesh.material as MeshStandardMaterial;
    tweak(material);
    materials.push(material);
  });
  return materials;
}

function setOpacity(materials: readonly MeshStandardMaterial[], opacity: number) {
  for (const material of materials) material.opacity = opacity;
}

// The spectre of the dwarf girl who died in the collapsed hut. Until her doll (Simona) is handed back she haunts the
// tunnels: she floats after the player with her arms stretched out, straight through the rock, and her touch hurts
// again and again (down to a defeat). Handing her the doll (backpack) turns her into the clear girl she was, who
// thanks the player and walks away fading (espectroCalmado).
export function Espectro() {
  const near = useVisibleFrom(VISIBLE_FROM.tunelesObjetos);
  const warming = useWarmingHere(VISIBLE_FROM.tunelesObjetos);
  const calmado = useProgressStore((state) => isEspectroCalmado(state.progress));
  const despedida = useTunelStore((state) => state.despedida);

  return (
    <group name="Espectro">
      {(warming || (near && !calmado)) && <Fantasma />}
      {despedida && <Despedida from={despedida} />}
    </group>
  );
}

function Fantasma() {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(FANTASMA_URL);
  const { actions } = useAnimations(animations, group);
  const position = useRef(new Vector3(...CAMARA_SIMONA));
  const brain = useRef({ chasing: false, nextHit: 0, lastWarning: -Infinity });
  const work = useMemo(() => ({ step: new Vector3(), facing: new Quaternion() }), []);

  useLayoutEffect(() => {
    ownMaterials(scene, (material) => {
      material.transparent = true;
      material.opacity = 0.78;
      material.emissive = new Color('#6fa8ff');
      material.emissiveIntensity = 0.55;
    });
  }, [scene]);

  useEffect(() => {
    actions.Flotar?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      const tunel = useTunelStore.getState();
      tunel.espectro.active = false;
      if (tunel.frio !== 0) tunel.setFrio(0);
    };
  }, [actions]);

  useFrame((state, rawDelta) => {
    if (!group.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const now = state.clock.elapsedTime;
    const b = brain.current;
    const p = position.current;
    const player = usePlayerStore.getState();
    const tunel = useTunelStore.getState();
    const haunting = useZoneStore.getState().region === 'tuneles' && player.health > 0 && !useWorldStore.getState().warming;
    const paused = isGameplayPaused();
    let frio = 0;

    if (haunting) {
      const step = work.step.set(player.position.x - p.x, player.position.y + HOVER - p.y, player.position.z - p.z);
      const distance = step.length();
      if (distance < AWARE_RANGE) b.chasing = true;
      if (b.chasing) {
        if (!paused && distance > KEEP_DISTANCE) p.addScaledVector(step, Math.min(distance - KEEP_DISTANCE, CHASE_SPEED * delta) / distance);
        if (!paused && distance < HIT_RANGE && now >= b.nextHit) {
          b.nextHit = now + HIT_SECONDS;
          player.takeDamage(HIT_DAMAGE);
          tunel.tocar();
          playGlide(640, 210, 0.8, 0.06);
          if (now - b.lastWarning > WARNING_SECONDS) {
            b.lastWarning = now;
            useToastStore.getState().showToast('El espectro de la niña te alcanza entre llantos: «¡Devuélvanme a Simona!». Su frío te quita la vida: entrégale la muñeca.');
          }
        }
        frio = MathUtils.clamp(1 - distance / COLD_RANGE, 0, 1);
        if (Math.hypot(step.x, step.z) > 1e-3) {
          work.facing.setFromAxisAngle(UP, Math.atan2(step.x, step.z));
          group.current.quaternion.slerp(work.facing, Math.min(1, 6 * delta));
        }
      }
    } else {
      // The player left the tunnels (or fell): she drifts back to her chamber.
      b.chasing = false;
      const step = work.step.set(CAMARA_SIMONA[0] - p.x, CAMARA_SIMONA[1] + HOVER - p.y, CAMARA_SIMONA[2] - p.z);
      const distance = step.length();
      if (distance > 0.05) p.addScaledVector(step, Math.min(distance, RETURN_SPEED * delta) / distance);
    }

    group.current.position.set(p.x, p.y + 0.1 * Math.sin(now * 2.1), p.z);
    tunel.espectro.position.copy(p);
    tunel.espectro.active = haunting && b.chasing;
    const cold = Math.round(frio * 5) / 5;
    if (cold !== tunel.frio) tunel.setFrio(cold);
  });

  return (
    <group ref={group} position={[...CAMARA_SIMONA]}>
      <primitive object={scene} />
    </group>
  );
}

function Despedida({ from }: { from: { x: number; y: number; z: number } }) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(CLARA_URL);
  const { actions } = useAnimations(animations, group);
  const [walking, setWalking] = useState(false);
  const live = useRef({ start: null as number | null, walking: false, away: new Vector3(), position: new Vector3(from.x, from.y, from.z) });
  const materials = useRef<MeshStandardMaterial[]>([]);
  const facing = useMemo(() => new Quaternion(), []);
  const { world, rapier } = useRapier();

  // Height of the tunnel floor under her (she starts where the spectre floated and walks along sloping galleries).
  const floorUnder = (x: number, y: number, z: number): number | null => {
    const fromY = y + 1.2;
    const hit = world.castRay(new rapier.Ray({ x, y: fromY, z }, DOWN), 4, true, undefined, undefined, undefined, undefined, isFloor);
    return hit ? fromY - hit.timeOfImpact : null;
  };

  useLayoutEffect(() => {
    materials.current = ownMaterials(scene, (material) => {
      material.transparent = true;
      material.opacity = 1;
      material.emissive = new Color('#fff3c4');
      material.emissiveIntensity = 0.35;
    });
  }, [scene]);

  useEffect(() => {
    const action = walking ? actions.Walking : actions.Alegria;
    action?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      action?.fadeOut(FADE_SECONDS);
    };
  }, [actions, walking]);

  useFrame((state, rawDelta) => {
    if (!group.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const now = state.clock.elapsedTime;
    const l = live.current;
    const player = usePlayerStore.getState().position;
    if (l.start === null) {
      l.start = now;
      // She will walk away from the player.
      l.away.set(l.position.x - player.x, 0, l.position.z - player.z);
      if (l.away.lengthSq() < 1e-4) l.away.set(0, 0, 1);
      l.away.normalize();
    }
    const elapsed = now - l.start;
    let look = l.away;
    if (elapsed < JOY_SECONDS) {
      look = l.away.clone().negate();
    } else {
      if (!l.walking) {
        l.walking = true;
        setWalking(true);
      }
      l.position.addScaledVector(l.away, WALK_SPEED * delta);
      const opacity = 1 - (elapsed - JOY_SECONDS) / FADE_OUT_SECONDS;
      setOpacity(materials.current, Math.max(0, opacity));
      if (opacity <= 0) useTunelStore.getState().setDespedida(null);
    }
    // Her feet stay on the floor, standing or walking.
    const floor = floorUnder(l.position.x, l.position.y, l.position.z);
    if (floor !== null) l.position.y = elapsed === 0 ? floor : MathUtils.damp(l.position.y, floor, 12, delta);
    facing.setFromAxisAngle(UP, Math.atan2(look.x, look.z));
    group.current.quaternion.slerp(facing, Math.min(1, 8 * delta));
    group.current.position.copy(l.position);
  });

  return (
    <group ref={group} position={[from.x, from.y, from.z]}>
      <primitive object={scene} />
    </group>
  );
}

// Preloaded one by one: both are mounted late (the spectre in the tunnels, the girl at the farewell) and each
// useGLTF(url) must find its own cache entry, or mounting would suspend the whole world for a moment.
useGLTF.preload(FANTASMA_URL);
useGLTF.preload(CLARA_URL);
