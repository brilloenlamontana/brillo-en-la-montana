import { LoopOnce, type AnimationAction } from 'three';

// Para animaciones de muerte o derribo: se reproducen una vez y se quedan en el último cuadro.
export function playOnceAndHold(action: AnimationAction) {
  action.setLoop(LoopOnce, 1);
  action.clampWhenFinished = true;
}
