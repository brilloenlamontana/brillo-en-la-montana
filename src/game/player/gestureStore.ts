import type { AnimationClip } from 'three';
import { create } from 'zustand';
import { GESTURES } from './gestureTable';

// Gestures with which the avatar takes an item out of the backpack and uses it: one per item. Each is a hand-made
// clip shared by every character (public/models-3d/animations/shared/<name>.glb), described pose by pose in
// tools/blender/gestos/<name>.json and solved by tools/blender/gestos.py. gestureTable.ts (generated from those
// files) says which arms each one drives and how its item sits in the hand.
export type GestureName = keyof typeof GESTURES;
export const GESTURE_NAMES = Object.keys(GESTURES) as GestureName[];

// A gesture poses the torso, the head and the arms it drives; the legs (and the other arm, in a one-armed gesture)
// keep doing what they were doing.
const UPPER_BODY = /Spine|Neck|Head|Shoulder|Arm|Hand/;
const OTHER_ARM = { right: /Left(Shoulder|Arm|ForeArm|Hand)/, left: /Right(Shoulder|Arm|ForeArm|Hand)/, both: null } as const;
export function keepGestureTracks(clip: AnimationClip, name: GestureName) {
  const other = OTHER_ARM[GESTURES[name].arms];
  clip.tracks = clip.tracks.filter((track) => UPPER_BODY.test(track.name) && track.name.endsWith('.quaternion') && !other?.test(track.name));
}

interface GestureState {
  // The gesture being asked for; `id` changes on every request, so the same one can be repeated. `itemUrl` is the
  // model of the item it handles (a GLB placed anywhere in the world: it is re-centered in the hand).
  // `onEffect` is what the item does: it runs at the instant of the gesture that GESTURES[name].effectAt marks (the
  // throw, the squeeze), not when the key is pressed. A defeat before that instant cancels it.
  request: { id: number; name: GestureName; itemUrl: string | null; onEffect: (() => void) | null } | null;
  play: (name: GestureName, itemUrl?: string | null, onEffect?: (() => void) | null) => void;
}

export const useGestureStore = create<GestureState>((set, get) => ({
  request: null,
  play: (name, itemUrl = null, onEffect = null) => set({ request: { id: (get().request?.id ?? 0) + 1, name, itemUrl, onEffect } }),
}));
