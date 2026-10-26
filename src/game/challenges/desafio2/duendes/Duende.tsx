import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { MathUtils, Quaternion, Vector3, type Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { playOnceAndHold } from '@/game/engine/models/animation';
import { useTerrainHeight } from '@/game/engine/physics/useTerrainHeight';
import { usePlayerStore } from '@/game/player/playerStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { DESAFIO2_MODELS } from '../assets';
import { useBosqueStore } from '../bosqueStore';

const URL = DESAFIO2_MODELS.duende;
// The model is 1.7 m tall: goblins are ~1.1 m.
const SCALE = 0.65;
const BODY_CAPSULE: [number, number] = [0.3, 0.28];
const BODY_CENTER: [number, number, number] = [0, 0.58, 0];
const FADE_SECONDS = 0.2;

// Each goblin gets its own speed and rhythm, so the pack never moves as one.
const CHASE_SPEED = [2.4, 3.4] as const;
const RETURN_SPEED = 1.8;
// It chases a point of its own around the player (angle and distance re-rolled every few seconds) and only closes in
// when near, so the pack surrounds the player instead of stacking on the same spot.
const SURROUND_RADIUS = [1.2, 2.6] as const;
const RETARGET_SECONDS = [1.5, 3.5] as const;
const CLOSE_IN_DISTANCE = 3.5;
const SEPARATION = 1.1;
const ATTACK_RANGE = 1.3;
const ATTACK_DAMAGE = 6;
// Fraction of the attack clip at which the blow lands; it lands if the player is still close.
const ATTACK_HIT_MOMENT = 0.45;
const ATTACK_COOLDOWN = [1.4, 2.6] as const;
const DEAD_SECONDS = 2.6;
const UP = new Vector3(0, 1, 0);

type DuendeState = 'idle' | 'chasing' | 'returning' | 'dying' | 'dead';
type DuendeAction = 'Idle' | 'Running' | 'Double_Combo_Attack' | 'Dead';

const between = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min);

// A wild goblin of the Dark Forest. It waits at its spot; while the player is in the forest it chases them and
// attacks when close; when the player leaves it walks back. The elven sword defeats it (saved in progress): it falls
// with the Dead animation and disappears.
export function Duende({ index, home }: { index: number; home: readonly [number, number] }) {
  const { scene, animations } = useGLTF(URL);
  // Its own skeleton, sharing geometry, material and texture with the other goblins.
  const model = useMemo(() => clone(scene), [scene]);
  const group = useRef<Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const { actions } = useAnimations(animations, group);
  const terrainHeight = useTerrainHeight();

  const brain = useRef({
    state: 'idle' as DuendeState,
    placed: false,
    // Rolled on its first frame (see below).
    speed: 0,
    offsetAngle: 0,
    offsetRadius: 0,
    retargetAt: 0,
    swingStart: null as number | null,
    swingHit: false,
    nextAttack: 0,
    diedAt: 0,
  });
  const position = useRef(new Vector3(home[0], -60, home[1]));
  const facing = useRef(new Quaternion());
  const actionRef = useRef<DuendeAction | null>(null);
  const work = useMemo(() => ({ target: new Vector3(), step: new Vector3() }), []);

  useEffect(() => {
    if (actions.Dead) playOnceAndHold(actions.Dead);
  }, [actions]);

  // Unmounted (the player went far away): it no longer counts for the sword.
  useEffect(
    () => () => {
      const tracker = useBosqueStore.getState().duendes[index];
      if (tracker) tracker.active = false;
    },
    [index],
  );

  const play = (next: DuendeAction) => {
    if (actionRef.current === next) return;
    if (actionRef.current) actions[actionRef.current]?.fadeOut(FADE_SECONDS);
    actions[next]?.reset().fadeIn(FADE_SECONDS).play();
    actionRef.current = next;
  };

  const face = (dx: number, dz: number, delta: number) => {
    if (!group.current || Math.hypot(dx, dz) < 1e-3) return;
    facing.current.setFromAxisAngle(UP, Math.atan2(dx, dz));
    group.current.quaternion.slerp(facing.current, Math.min(1, 10 * delta));
  };

  // Moves toward (tx, tz), pushed away from the other goblins, following the ground. Returns the distance left.
  const moveTowards = (tx: number, tz: number, speed: number, delta: number) => {
    const p = position.current;
    const step = work.step.set(tx - p.x, 0, tz - p.z);
    const distance = step.length();
    if (distance > 1e-3) step.multiplyScalar(Math.min(distance, speed * delta) / distance);
    useBosqueStore.getState().duendes.forEach((other, i) => {
      if (i === index || !other.active) return;
      const dx = p.x - other.position.x, dz = p.z - other.position.z, d = Math.hypot(dx, dz);
      if (d > 1e-3 && d < SEPARATION) step.addScaledVector(work.target.set(dx / d, 0, dz / d), (SEPARATION - d) * 2 * delta);
    });
    p.x += step.x;
    p.z += step.z;
    const ground = terrainHeight(p.x, p.z, p.y + 3, 8);
    if (ground !== null) p.y = MathUtils.damp(p.y, ground, 10, delta);
    face(step.x, step.z, delta);
    return distance;
  };

  useFrame((state, rawDelta) => {
    if (!body.current || !group.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const now = state.clock.elapsedTime;
    const b = brain.current;
    const p = position.current;
    const player = usePlayerStore.getState();

    // First frames: stand on the ground at its spot (the terrain collider may not exist yet) and roll its own speed.
    if (!b.placed) {
      const ground = terrainHeight(home[0], home[1], 150, 250);
      if (ground === null) return;
      p.set(home[0], ground, home[1]);
      b.speed = between(CHASE_SPEED);
      b.placed = true;
    }

    const defeated = useProgressStore.getState().progress.duendesDefeated.includes(index);
    if (defeated && b.state !== 'dying' && b.state !== 'dead') {
      b.state = 'dying';
      b.diedAt = now;
    }
    // The story started over (second or third "bajo"): it comes back at its spot.
    if (!defeated && (b.state === 'dying' || b.state === 'dead')) {
      b.state = 'idle';
      p.set(home[0], p.y, home[1]);
    }

    const chase = useZoneStore.getState().region === 'bosque' && player.health > 0;
    const toPlayerX = player.position.x - p.x, toPlayerZ = player.position.z - p.z;
    const playerDistance = Math.hypot(toPlayerX, toPlayerZ);
    let action: DuendeAction = 'Idle';

    switch (b.state) {
      case 'dying':
        action = 'Dead';
        if (now - b.diedAt > DEAD_SECONDS) b.state = 'dead';
        break;
      case 'dead':
        break;
      case 'idle':
        if (chase) b.state = 'chasing';
        break;
      case 'returning':
        if (chase) {
          b.state = 'chasing';
          break;
        }
        action = 'Running';
        if (moveTowards(home[0], home[1], RETURN_SPEED, delta) < 0.3) b.state = 'idle';
        break;
      case 'chasing': {
        if (!chase) {
          b.state = 'returning';
          b.swingStart = null;
          break;
        }
        // A started blow always finishes.
        if (b.swingStart === null && playerDistance < ATTACK_RANGE && now >= b.nextAttack) {
          b.swingStart = now;
          b.swingHit = false;
        }
        if (b.swingStart !== null) {
          action = 'Double_Combo_Attack';
          face(toPlayerX, toPlayerZ, delta);
          const duration = actions.Double_Combo_Attack?.getClip().duration ?? 1.5;
          const elapsed = now - b.swingStart;
          if (!b.swingHit && elapsed >= duration * ATTACK_HIT_MOMENT) {
            b.swingHit = true;
            if (playerDistance < ATTACK_RANGE + 0.5) player.takeDamage(ATTACK_DAMAGE);
          }
          if (elapsed >= duration) {
            b.swingStart = null;
            b.nextAttack = now + between(ATTACK_COOLDOWN);
          }
          break;
        }
        if (now >= b.retargetAt) {
          b.offsetAngle = Math.random() * Math.PI * 2;
          b.offsetRadius = between(SURROUND_RADIUS);
          b.retargetAt = now + between(RETARGET_SECONDS);
        }
        const close = playerDistance < CLOSE_IN_DISTANCE;
        const tx = player.position.x + (close ? 0 : Math.cos(b.offsetAngle) * b.offsetRadius);
        const tz = player.position.z + (close ? 0 : Math.sin(b.offsetAngle) * b.offsetRadius);
        if (playerDistance > ATTACK_RANGE * 0.8) {
          action = 'Running';
          moveTowards(tx, tz, b.speed, delta);
        } else {
          face(toPlayerX, toPlayerZ, delta);
        }
        break;
      }
    }

    // Once gone, its body goes under the ground so it no longer blocks the path.
    body.current.setNextKinematicTranslation(b.state === 'dead' ? work.target.set(p.x, p.y - 60, p.z) : p);
    group.current.visible = b.state !== 'dead';
    const tracker = useBosqueStore.getState().duendes[index];
    tracker.position.copy(p);
    tracker.active = b.state !== 'dying' && b.state !== 'dead';
    if (b.state !== 'dead') play(action);
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[home[0], -60, home[1]]}>
      <CapsuleCollider args={BODY_CAPSULE} position={BODY_CENTER} />
      <group ref={group} dispose={null}>
        <primitive object={model} scale={SCALE} />
      </group>
    </RigidBody>
  );
}

useGLTF.preload(URL);
