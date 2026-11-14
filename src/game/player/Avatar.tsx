import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AnimationUtils, LoopOnce, MathUtils, Matrix4, Quaternion, Vector3, type AnimationClip, type Group, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { avatarModelUrl, findCharacter, genderFolder } from '@/data/characters';
import { playOnceAndHold, setPace } from '@/game/engine/models/animation';
import { useAuthStore, type AvatarGender } from '@/store/authStore';
import { AvatarGestures, HeldItemModel } from './AvatarGestures';
import { GESTURES, HAND_AXES } from './gestureTable';
import { GESTURE_NAMES, gestureAim, keepGestureTracks, type GestureName } from './gestureStore';
import { usePlayerStore, type ScenePose } from './playerStore';

const FADE_SECONDS = 0.25;
const TEXTURE_ANISOTROPY = 8;
const ANIMATIONS_DIR = '/models-3d/animations';
// Every character shares the Mixamo skeleton, so the clips are skeleton-only files reused by all of them: the
// locomotion set of the character's gender plus the clips common to everyone.
const GENDER_CLIPS = ['Idle', 'Walking', 'Running'] as const;
const SHARED_CLIPS = ['Death', 'Hit', 'Pulso', 'Arrodillarse', ...GESTURE_NAMES] as const;
const CLIP_NAMES = [...GENDER_CLIPS, ...SHARED_CLIPS];
type ClipName = (typeof CLIP_NAMES)[number];

// Ground speed each locomotion clip was animated for, in meters per second per meter of character height (measured
// on the feet of the canonical skeleton). Each clip is played faster or slower so the feet keep up with the real
// speed of the capsule instead of sliding or spinning.
const CLIP_SPEED: Record<AvatarGender, { Walking: number; Running: number }> = {
  female: { Walking: 0.84, Running: 3.0 },
  male: { Walking: 0.92, Running: 2.95 },
};
// The short characters would have to spin their legs to keep up: past this the clip is not sped up any more (their
// feet slide a little instead).
const TIME_SCALE_RANGE: [number, number] = [0.65, 1.35];
// The flinch of a blow (shared/Hit.glb, hand-made in tools/blender/golpe.py) is added on top of whatever the avatar
// is doing, a little exaggerated so it reads from the third-person camera. Damage smaller than HIT_MIN_DAMAGE (the
// slow drain of hunger) does not flinch, and a flinch is not restarted before HIT_AGAIN_SECONDS.
const HIT_WEIGHT = 1.25;
const HIT_MIN_DAMAGE = 2;
const HIT_AGAIN_SECONDS = 0.3;
// The run clip takes over once the avatar is really running (it accelerates from the walk for a moment), and gives way
// to the walk again a little lower, so the two never flicker.
const RUN_FROM_SPEED = 3.4;
const RUN_UNTIL_SPEED = 2.8;

// A scripted scene poses the avatar (playerStore.pose): how fast it gets into place and back (1/s), how high its
// shoulders are (per metre of height: the lean pivots on the feet).
const POSE_GLIDE = 7;
const SHOULDER_HEIGHT = 0.79;
// A gesture meant for someone (gestureStore.gestureAim): how fast the avatar turns to face them and back (1/s).
const AIM_TURN = 9;
const UP = new Vector3(0, 1, 0);

// Turns `bone` by a rotation given in world space (the animation has just posed it).
const turn = { world: new Quaternion(), parent: new Quaternion() };
function turnInWorld(bone: Object3D, rotation: Quaternion) {
  bone.getWorldQuaternion(turn.world).premultiply(rotation);
  bone.parent!.getWorldQuaternion(turn.parent).invert();
  bone.quaternion.copy(turn.parent.multiply(turn.world));
  bone.updateMatrixWorld(true);
}

// Scratch values of placeForScene, and the arm it solves.
const sceneWork = () => ({
  feet: new Vector3(),
  axis: new Vector3(),
  lean: new Quaternion(),
  parent: new Quaternion(),
  turn: new Quaternion(),
  a: new Vector3(),
  b: new Vector3(),
  c: new Vector3(),
  target: new Vector3(),
  from: new Vector3(),
  to: new Vector3(),
  goal: new Vector3(),
  pole: new Vector3(),
  side: new Vector3(),
  basis: new Matrix4(),
  local: new Matrix4(),
});
type SceneWork = ReturnType<typeof sceneWork>;
type Arm = { upper?: Object3D; fore?: Object3D; hand?: Object3D; knuckle?: Object3D };
type SceneArm = Arm & { left: Arm };

// The elbow of a reaching arm points down, a little out to its side and back (per unit: down, aside, back).
const ELBOW_POLE = [1, 0.55, 0.35] as const;

// Lays the right hand flat: its palm faces `palm` and its fingers point along `fingers` (world directions), as far as
// `weight` (0..1) says.
function layHand(arm: Arm, palm: Vector3, fingers: Vector3, weight: number, work: SceneWork) {
  const { hand, knuckle } = arm;
  if (!hand || !knuckle || weight < 0.002) return;
  const { from, to, axis, side } = work;
  // In the hand bone's own space: toward the knuckles, and out of the palm (made square to it).
  from.copy(knuckle.position).normalize();
  axis.fromArray(HAND_AXES.right.palm).addScaledVector(from, -axis.dot(from)).normalize();
  work.local.makeBasis(from, axis, side.crossVectors(from, axis));
  // In the world: along the fingers, and out of the palm (made square to them).
  to.copy(fingers).normalize();
  axis.copy(palm).addScaledVector(to, -palm.dot(to)).normalize();
  work.basis.makeBasis(to, axis, side.crossVectors(to, axis)).multiply(work.local.transpose());
  work.turn.setFromRotationMatrix(work.basis);
  hand.getWorldQuaternion(turn.world).slerp(work.turn, weight);
  hand.parent!.getWorldQuaternion(turn.parent).invert();
  hand.quaternion.copy(turn.parent.multiply(turn.world));
  hand.updateMatrixWorld(true);
}

// An arm (already posed by the clip) reaches for `goal` with its wrist: the upper arm and the forearm are turned so
// the wrist gets there, or as near as the arm is long, with the elbow bent toward `pole`. `weight` (0..1) blends it in.
function reachFor(arm: Arm, goal: Vector3, pole: Vector3, weight: number, work: SceneWork) {
  const { upper, fore, hand } = arm;
  if (!upper || !fore || !hand || weight < 0.002) return;
  const { a, b, c, target, from, to, axis } = work;
  upper.getWorldPosition(a);
  fore.getWorldPosition(b);
  hand.getWorldPosition(c);
  const upperLength = a.distanceTo(b);
  const foreLength = b.distanceTo(c);
  to.copy(goal).sub(a);
  const far = to.length();
  if (far < 1e-4) return;
  to.divideScalar(far);
  const reach = MathUtils.clamp(far, Math.abs(upperLength - foreLength) + 0.01, upperLength + foreLength - 0.004);
  // Where the elbow goes: on the circle around the shoulder-to-goal line, on the side of the pole.
  const along = (upperLength * upperLength + reach * reach - foreLength * foreLength) / (2 * reach);
  const out = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  axis.copy(pole).addScaledVector(to, -pole.dot(to));
  if (axis.lengthSq() < 1e-6) axis.set(0, -1, 0).addScaledVector(to, to.y);
  axis.normalize();
  target.copy(a).addScaledVector(to, along).addScaledVector(axis, out);
  work.goal.copy(a).addScaledVector(to, reach);
  work.turn.setFromUnitVectors(from.copy(b).sub(a).normalize(), to.copy(target).sub(a).normalize());
  turnInWorld(upper, work.parent.identity().slerp(work.turn, weight));
  fore.getWorldPosition(b);
  hand.getWorldPosition(c);
  work.turn.setFromUnitVectors(from.copy(c).sub(b).normalize(), to.copy(work.goal).sub(b).normalize());
  turnInWorld(fore, work.parent.identity().slerp(work.turn, weight));
}

// A gesture meant for someone: the drawn avatar turns to face them, whichever way its capsule is turned, and goes
// back to it when the gesture ends. A scene's pose decides the facing by itself.
function faceGestureAim(avatar: Group, position: Vector3, delta: number, aimed: { amount: number; yaw: number }, work: SceneWork) {
  const aim = gestureAim.current?.() ?? null;
  if (aim) {
    const dx = aim.x - position.x;
    const dz = aim.z - position.z;
    if (Math.hypot(dx, dz) > 0.05) aimed.yaw = Math.atan2(dx, dz);
  }
  aimed.amount = MathUtils.damp(aimed.amount, aim ? 1 : 0, AIM_TURN, Math.min(delta, 0.1));
  if (aimed.amount < 0.002) return;
  avatar.parent!.getWorldQuaternion(work.parent);
  work.lean.setFromAxisAngle(UP, aimed.yaw).premultiply(work.turn.copy(work.parent).invert());
  avatar.quaternion.slerp(work.lean, aimed.amount);
}

// A scene's pose: the avatar is drawn standing at pose.feet, facing pose.yaw and leaning with pose.sway, and its right
// arm (already posed by the clip) is put in place: the upper arm points at pose.elbow, where the elbow rests, and the
// forearm rises from there toward pose.hand. A pose that touches something reaches for it instead (reachFor), with
// one hand or both. It glides in and out of place.
function placeForScene(avatar: Group, pose: ScenePose | null, delta: number, posed: { current: number }, work: SceneWork, arm: SceneArm, height: number) {
  posed.current = MathUtils.damp(posed.current, pose ? 1 : 0, POSE_GLIDE, Math.min(delta, 0.1));
  const amount = posed.current;
  if (!pose || amount < 0.002) {
    if (!pose && amount < 0.002) posed.current = 0;
    avatar.position.multiplyScalar(amount < 0.002 ? 0 : amount);
    avatar.quaternion.slerp(work.lean.identity(), amount < 0.002 ? 1 : 1 - amount);
    return;
  }
  const parent = avatar.parent!;
  avatar.position.copy(parent.worldToLocal(work.feet.copy(pose.feet))).multiplyScalar(amount);
  // Leaning: the shoulders move by `sway` while the feet stay (a turn around a horizontal axis, in the parent's frame).
  const sway = pose.sway.length();
  work.axis.crossVectors(UP, pose.sway);
  if (sway > 1e-4) work.lean.setFromAxisAngle(work.axis.normalize(), (amount * sway) / (SHOULDER_HEIGHT * height));
  else work.lean.identity();
  // It faces where the scene says, whichever way the capsule was left turned (blended in from that).
  parent.getWorldQuaternion(work.parent);
  work.lean.multiply(work.turn.setFromAxisAngle(UP, pose.yaw)).premultiply(work.turn.copy(work.parent).invert());
  avatar.quaternion.identity().slerp(work.lean, amount);
  avatar.updateMatrixWorld(true);

  const { upper, fore, hand } = arm;
  const reach = amount * pose.reach;
  if (pose.touch) {
    // The avatar's right is at (-cos yaw, 0, sin yaw); its back at (-sin yaw, 0, -cos yaw).
    const [down, aside, back] = ELBOW_POLE;
    const sin = Math.sin(pose.yaw);
    const cos = Math.cos(pose.yaw);
    reachFor(arm, pose.hand, work.pole.set(-cos * aside - sin * back, -down, sin * aside - cos * back), reach, work);
    if (pose.palm && pose.fingers) layHand(arm, pose.palm, pose.fingers, reach, work);
    if (pose.left) reachFor(arm.left, pose.left, work.pole.set(cos * aside - sin * back, -down, -sin * aside - cos * back), amount, work);
    return;
  }
  if (!upper || !fore || !hand || reach < 0.002) return;
  const { a, b, c, target, from, to } = work;
  upper.getWorldPosition(a);
  fore.getWorldPosition(b);
  // The upper arm points at where the elbow rests (from where the clip left it, as far as `reach` says).
  target.copy(b).lerp(pose.elbow, reach);
  turnInWorld(upper, work.turn.setFromUnitVectors(from.copy(b).sub(a).normalize(), to.copy(target).sub(a).normalize()));
  // The forearm rises from the elbow toward where the scene wants the hand.
  fore.getWorldPosition(b);
  hand.getWorldPosition(c);
  work.turn.setFromUnitVectors(from.copy(c).sub(b).normalize(), to.copy(pose.hand).sub(b).normalize());
  turnInWorld(fore, work.parent.identity().slerp(work.turn, reach));
}


const clipUrls = (gender: AvatarGender) => [
  ...GENDER_CLIPS.map((clip) => `${ANIMATIONS_DIR}/${genderFolder(gender)}/${clip}.glb`),
  ...SHARED_CLIPS.map((clip) => `${ANIMATIONS_DIR}/shared/${clip}.glb`),
];

// The character chosen by the player, animated from playerStore.action (crossfading between clips) and from how fast
// it is really moving. Taking damage plays no animation of its own.
export function Avatar() {
  const avatarRef = useRef<Group>(null);
  const avatarName = useAuthStore((state) => state.user?.avatarName);
  const action = usePlayerStore((state) => state.action);
  // The clip of a scripted scene that poses the avatar, if any.
  const poseClip = usePlayerStore((state) => state.pose?.clip ?? null);
  // Something a scene has the avatar keep on (the miner's glove).
  const wear = usePlayerStore((state) => state.wear);
  const worn = useRef(true);
  // Really running: the capsule has picked up running speed.
  const [atRunSpeed, setAtRunSpeed] = useState(false);
  const motion = useRef({ previous: new Vector3(), placed: false, speed: 0, atRunSpeed: false });
  // How much of the scene's pose shows (0..1), and scratch values for placing it.
  const posed = useRef(0);
  const aimed = useRef({ amount: 0, yaw: 0 });
  const work = useMemo(() => sceneWork(), []);

  const character = findCharacter(avatarName);
  const { scene } = useGLTF(avatarModelUrl(avatarName));
  const clipFiles = useGLTF(clipUrls(character.gender));
  // Each file holds one clip; it is renamed after its action so useAnimations exposes actions.Idle, actions.Walking...
  const clips = useMemo(
    () =>
      clipFiles.flatMap(({ animations }, i): AnimationClip[] => {
        if (!animations.length) return [];
        const clip = animations[0].clone();
        clip.name = CLIP_NAMES[i];
        // Only what the flinch changes from its first frame is kept: it adds to the clip being played.
        if (clip.name === 'Hit') AnimationUtils.makeClipAdditive(clip);
        if (GESTURE_NAMES.includes(clip.name as GestureName)) keepGestureTracks(clip, clip.name as GestureName);
        return [clip];
      }),
    [clipFiles],
  );
  const { actions } = useAnimations(clips, avatarRef);
  const arm = useMemo(
    () => ({
      upper: scene.getObjectByName('mixamorigRightArm'),
      fore: scene.getObjectByName('mixamorigRightForeArm'),
      hand: scene.getObjectByName('mixamorigRightHand'),
      knuckle: scene.getObjectByName('mixamorigRightHandMiddle1'),
      left: { upper: scene.getObjectByName('mixamorigLeftArm'), fore: scene.getObjectByName('mixamorigLeftForeArm'), hand: scene.getObjectByName('mixamorigLeftHand') },
    }),
    [scene],
  );

  // The skinned body follows the bones far from its rest bounding box (death, big strides): never cull it.
  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      // Its texture stays sharp where the surface turns away from the camera (cheeks, arms, cape).
      for (const material of ([] as Material[]).concat(mesh.material)) {
        const map = (material as MeshStandardMaterial).map;
        if (map && map.anisotropy !== TEXTURE_ANISOTROPY) {
          map.anisotropy = TEXTURE_ANISOTROPY;
          map.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    if (actions.Death) playOnceAndHold(actions.Death);
    // Kneeling down is done once; the avatar then stays on its knee.
    if (actions.Arrodillarse) playOnceAndHold(actions.Arrodillarse);
  }, [actions]);

  // A blow makes the avatar flinch; a defeat plays Death instead.
  useEffect(() => {
    const hit = actions.Hit;
    if (!hit) return;
    hit.setLoop(LoopOnce, 1);
    let last = -Infinity;
    return usePlayerStore.subscribe((state, previous) => {
      if (state.health <= 0) return void hit.stop();
      const now = performance.now() / 1000;
      if (previous.health - state.health < HIT_MIN_DAMAGE || now - last < HIT_AGAIN_SECONDS) return;
      last = now;
      hit.reset().setEffectiveWeight(HIT_WEIGHT).play();
    });
  }, [actions]);

  const shown: ClipName = action === 'Death' ? 'Death' : (poseClip ?? (action === 'Running' && !atRunSpeed ? 'Walking' : action));
  useEffect(() => {
    const current = actions[shown];
    current?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      current?.fadeOut(FADE_SECONDS);
    };
  }, [shown, actions]);

  // Shares the player's position every frame without re-renders or allocations (zones, enemies, items read it), and
  // matches the pace of the walk and run clips to the real ground speed.
  useFrame((_, delta) => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    const { position, pose } = usePlayerStore.getState();
    // Where the capsule stands, whatever a scene does with the drawn avatar.
    avatar.parent!.getWorldPosition(position);
    placeForScene(avatar, pose, delta, posed, work, arm, character.height);
    if (!pose) faceGestureAim(avatar, position, delta, aimed.current, work);

    const m = motion.current;
    if (m.placed && delta > 0) {
      const instant = Math.hypot(position.x - m.previous.x, position.z - m.previous.z) / delta;
      // A teleport is not a sprint.
      if (instant < 15) m.speed = MathUtils.damp(m.speed, instant, 10, delta);
    }
    m.previous.copy(position);
    m.placed = true;

    const running = m.atRunSpeed ? m.speed > RUN_UNTIL_SPEED : m.speed > RUN_FROM_SPEED;
    if (running !== m.atRunSpeed) {
      m.atRunSpeed = running;
      setAtRunSpeed(running);
    }

    const natural = CLIP_SPEED[character.gender];
    for (const clip of ['Walking', 'Running'] as const) {
      setPace(actions[clip], MathUtils.clamp(m.speed / (natural[clip] * character.height), ...TIME_SCALE_RANGE));
    }
  });

  return (
    <group ref={avatarRef} dispose={null}>
      <primitive object={scene} />
      <AvatarGestures actions={actions} scene={scene} height={character.height} />
      {wear && (
        <Suspense fallback={null}>
          <HeldItemModel key={wear.url} url={wear.url} grip={wear.grip ?? GESTURES[wear.gesture].item} skeleton={scene} height={character.height} visible={worn} />
          {wear.left && <HeldItemModel key={wear.left.url} url={wear.left.url} grip={wear.left.grip} skeleton={scene} height={character.height} visible={worn} />}
        </Suspense>
      )}
    </group>
  );
}

useGLTF.preload(clipUrls('female'));
