import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { ANILLO_MIRA, avanzarAnillo, terminarAnillo } from './anillo';
import { enElMundo, useChozaStore } from './limpieza';

const UP = new Vector3(0, 1, 0);
// The camera while the ring is taken: to the statue's other side, near, so the hands of both and the ring show, with
// the fire at the edge of the picture.
const CAMARA = (() => {
  const at = enElMundo([1.75, -0.95]);
  return { position: new Vector3(at.x, 10.95, at.z), lookAt: new Vector3(ANILLO_MIRA.x, ANILLO_MIRA.y + 0.3, ANILLO_MIRA.z) };
})();
const GLIDE = 4;

// Taking the ring inside the canvas: it moves the scene forward every frame and takes the camera near the statue's
// hands; when it ends the camera glides back to the player's controls.
export function AnilloEscena() {
  const weight = useRef(0);
  const work = useMemo(() => ({ matrix: new Matrix4(), facing: new Quaternion() }), []);

  // Leaving the hut's part of the world ends it.
  useEffect(() => terminarAnillo, []);

  useFrame(({ camera }, delta) => {
    avanzarAnillo(performance.now());
    const { anillo } = useChozaStore.getState();
    weight.current = MathUtils.damp(weight.current, anillo && anillo.fase !== 'camino' ? 1 : 0, GLIDE, Math.min(delta, 0.1));
    if (weight.current < 0.002) {
      weight.current = 0;
      return;
    }
    const w = MathUtils.smoothstep(weight.current, 0, 1);
    camera.position.lerp(CAMARA.position, w);
    camera.quaternion.slerp(work.facing.setFromRotationMatrix(work.matrix.lookAt(camera.position, CAMARA.lookAt, UP)), w);
    camera.updateMatrixWorld();
  });

  return null;
}
