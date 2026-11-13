import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Group, LoopOnce, Matrix4, Vector3, type AnimationAction, type Object3D } from 'three';
import { useGestureStore, type GestureName } from './gestureStore';
import { GESTURES, HAND_AXES, type GestureItem } from './gestureTable';
import { usePlayerStore } from './playerStore';

// The gesture takes over the upper body in FADE_IN seconds and gives it back in FADE_OUT. The mixer averages the
// clips that move a bone by their weights, so a weight far above the walk's 1 means "this one, almost alone".
const FADE_IN = 0.12;
const FADE_OUT = 0.2;
const FULL_WEIGHT = 400;
const blendWeight = (share: number) => (share >= 0.995 ? FULL_WEIGHT : share <= 0 ? 0 : share / (1 - share));

// Item sizes are given in meters next to a character of this height.
const REFERENCE_HEIGHT = 1.7;
const AXES = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

const show = (object: Object3D, visible: boolean) => {
  object.visible = visible;
};

// Starts a gesture from its first frame, silent until the first frame raises its weight; it plays once.
function startGesture(action: AnimationAction) {
  action.reset();
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
  action.setEffectiveWeight(0);
  action.play();
}

// `v` without its part along the others, normalized.
function perpendicular(v: readonly number[], ...others: Vector3[]) {
  const out = new Vector3(v[0], v[1], v[2]);
  for (const other of others) out.addScaledVector(other, -out.dot(other));
  return out.normalize();
}

// Where and how the item sits in the hand bone's own space. The same rule as the preview of tools/blender
// (gestos_vista.py): its longest side lies along the grip (it comes out by the thumb side, like a sword), its second
// side points to the knuckles and its thinnest one faces the palm.
function placeInHand(holder: Group, size: Vector3, grip: GestureItem, hand: Object3D, knuckle: Object3D, height: number) {
  hand.updateWorldMatrix(true, false);
  const meters = height / REFERENCE_HEIGHT / (hand.getWorldScale(new Vector3()).x || 1);
  const toKnuckle = knuckle.position.clone();
  const knuckles = toKnuckle.clone().normalize();
  const axes = HAND_AXES[grip.hand];
  const blade = perpendicular(axes.blade, knuckles);
  const palm = perpendicular(axes.palm, knuckles, blade);

  const sides = [size.x, size.y, size.z];
  const order = [0, 1, 2].sort((a, b) => sides[b] - sides[a] || a - b);
  const [long, mid, short] = order.map((i) => AXES[i]);
  const turn = (grip.turn * Math.PI) / 180;
  // The long side lies along the grip, the knuckles or the palm normal; the second side follows the next axis.
  const [longAxis, midAxis] = grip.along === 'blade' ? [blade, knuckles] : grip.along === 'knuckles' ? [knuckles, palm] : [palm, blade];
  const longTo = longAxis.clone().multiplyScalar(grip.flip ? -1 : 1);
  const midTo = midAxis.clone().multiplyScalar(Math.cos(turn)).addScaledVector(longTo.clone().cross(midAxis), Math.sin(turn));
  const handed = long.clone().cross(mid).dot(short) > 0 ? 1 : -1;
  const shortTo = longTo.clone().cross(midTo).multiplyScalar(handed);
  const rotation = new Matrix4().makeBasis(longTo, midTo, shortTo).multiply(new Matrix4().makeBasis(long, mid, short).transpose());

  const length = grip.size * meters;
  holder.quaternion.setFromRotationMatrix(rotation);
  holder.scale.setScalar(length / Math.max(...sides, 1e-6));
  holder.position.copy(toKnuckle).multiplyScalar(0.8).addScaledVector(palm, 0.3 * toKnuckle.length());
  // Gripped by one end: the item reaches out from the hand along that axis (`flip` chooses which end is held).
  if (grip.byEnd) holder.position.addScaledVector(longAxis, length / 2 - grip.handle * meters);
  holder.position
    .addScaledVector(blade, grip.offset[0] * meters)
    .addScaledVector(knuckles, grip.offset[1] * meters)
    .addScaledVector(palm, grip.offset[2] * meters);
}

type HeldItemModelProps = { url: string; grip: GestureItem; skeleton: Object3D; height: number; visible: RefObject<boolean> };

// The item, re-centered (its GLB is placed somewhere in the world), sized and hung from the hand bone.
export function HeldItemModel({ url, grip, skeleton, height, visible }: HeldItemModelProps) {
  const { scene } = useGLTF(url);
  const { holder, size } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const centered = new Group();
    centered.add(scene.clone(true));
    centered.position.copy(box.getCenter(new Vector3())).negate();
    const holder = new Group();
    holder.add(centered);
    holder.visible = false;
    return { holder, size: box.getSize(new Vector3()) };
  }, [scene]);

  useLayoutEffect(() => {
    const side = grip.hand === 'left' ? 'Left' : 'Right';
    const hand = skeleton.getObjectByName(`mixamorig${side}Hand`);
    const knuckle = skeleton.getObjectByName(`mixamorig${side}HandMiddle1`);
    if (!hand || !knuckle) return;
    placeInHand(holder, size, grip, hand, knuckle, height);
    hand.add(holder);
    return () => {
      hand.remove(holder);
    };
  }, [skeleton, holder, size, grip, height]);

  useFrame(() => show(holder, visible.current));
  return null;
}

type AvatarGesturesProps = {
  actions: Record<string, AnimationAction | null>;
  // The avatar's model, whose skeleton holds the item.
  scene: Object3D;
  height: number;
};

// Plays the gestures asked through gestureStore over whatever the avatar is doing, with the item in the hand while
// the gesture holds it. A defeat cuts the gesture short.
export function AvatarGestures({ actions, scene, height }: AvatarGesturesProps) {
  const request = useGestureStore((state) => state.request);
  // Requests made before this avatar existed are not replayed; `doneId` is the last one that finished.
  const [skippedId] = useState(() => request?.id ?? 0);
  const [doneId, setDoneId] = useState(0);
  // `effect` is what the item does, still waiting for its instant of the gesture.
  const playing = useRef<{ action: AnimationAction; name: GestureName; id: number; effect: (() => void) | null } | null>(null);
  const itemVisible = useRef(false);
  const pending = request && request.id !== skippedId && request.id !== doneId ? request : null;

  // The item of a gesture that is cut short (another one starts, the character changes) still does its thing.
  const finish = () => {
    const current = playing.current;
    playing.current = null;
    current?.action.stop();
    if (usePlayerStore.getState().health > 0) current?.effect?.();
  };

  useEffect(() => {
    if (!pending) return;
    const action = actions[pending.name];
    if (usePlayerStore.getState().health <= 0) return;
    finish();
    if (!action) return void pending.onEffect?.();
    startGesture(action);
    playing.current = { action, name: pending.name, id: pending.id, effect: pending.onEffect };
    itemVisible.current = false;
  }, [pending, actions]);

  // A new character (profile change) starts with empty hands.
  useEffect(() => finish, [actions]);

  useFrame(() => {
    const current = playing.current;
    if (!current) return;
    const { action, name, id } = current;
    const duration = action.getClip().duration;
    const time = action.time;
    if (time >= duration - 0.01 || usePlayerStore.getState().health <= 0) {
      finish();
      itemVisible.current = false;
      setDoneId(id);
      return;
    }
    if (current.effect && time >= GESTURES[name].effectAt) {
      const effect = current.effect;
      current.effect = null;
      effect();
    }
    action.setEffectiveWeight(blendWeight(Math.min(1, time / FADE_IN, (duration - time) / FADE_OUT)));
    const [from, until] = GESTURES[name].item.held;
    itemVisible.current = time >= from && time <= until;
  });

  if (!pending?.itemUrl) return null;
  return (
    <Suspense fallback={null}>
      <HeldItemModel key={pending.itemUrl} url={pending.itemUrl} grip={GESTURES[pending.name].item} skeleton={scene} height={height} visible={itemVisible} />
    </Suspense>
  );
}
