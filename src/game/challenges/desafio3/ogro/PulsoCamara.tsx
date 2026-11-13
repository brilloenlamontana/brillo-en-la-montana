import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { PULSO_CAMARA } from '../lugares';
import { useTunelStore } from '../tunelStore';

const UP = new Vector3(0, 1, 0);
// How fast the camera goes to the side of the table and comes back (1/s).
const GLIDE = 4;

// The camera of the arm wrestling (inside the canvas). While it is played the camera is taken every frame, after the
// player's camera controls have placed it, to one side of the table, where the Ogre and the avatar are seen face to
// face; the player cannot turn it. When it ends the camera glides back to where the controls keep it, behind the
// avatar.
export function PulsoCamara() {
  const weight = useRef(0);
  const work = useMemo(
    () => ({ position: new Vector3(...PULSO_CAMARA.position), lookAt: new Vector3(...PULSO_CAMARA.lookAt), matrix: new Matrix4(), facing: new Quaternion() }),
    [],
  );

  useFrame(({ camera }, delta) => {
    const playing = useTunelStore.getState().pulso !== null;
    weight.current = MathUtils.damp(weight.current, playing ? 1 : 0, GLIDE, Math.min(delta, 0.1));
    if (weight.current < 0.002) {
      weight.current = 0;
      return;
    }
    const w = MathUtils.smoothstep(weight.current, 0, 1);
    camera.position.lerp(work.position, w);
    camera.quaternion.slerp(work.facing.setFromRotationMatrix(work.matrix.lookAt(camera.position, work.lookAt, UP)), w);
    camera.updateMatrixWorld();
  });

  return null;
}
