import { LoopOnce, type AnimationAction } from 'three';

// For death or knockdown animations: plays once and holds on the last frame.
export function playOnceAndHold(action: AnimationAction) {
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
}

