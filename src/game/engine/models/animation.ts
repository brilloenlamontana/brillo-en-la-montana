import { LoopOnce, type AnimationAction } from 'three';

// For death or knockdown animations: plays once and holds on the last frame.
export function playOnceAndHold(action: AnimationAction) {
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
}


// Plays a clip faster or slower (1 = as animated), e.g. to keep a walk in step with the real ground speed.
export function setPace(action: AnimationAction | null | undefined, timeScale: number) {
  if (action) action.timeScale = timeScale;
}
