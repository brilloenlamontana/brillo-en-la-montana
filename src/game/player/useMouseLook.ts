import { useEffect, type RefObject } from 'react';
import { CameraControlsImpl } from '@react-three/drei';
import type { EcctrlCameraControlsHandle } from 'ecctrl/camera';

// Third-person camera: rotates only while dragging with mouse click (left or right).
// Wheel and middle click do nothing so camera does not zoom or pan. Touch remains unchanged.
export function useMouseLook(controlsRef: RefObject<EcctrlCameraControlsHandle | null>, enabled: boolean) {
  useEffect(() => {
    const controls = controlsRef.current;
    if (!enabled || !controls) return;
    const { ROTATE, NONE } = CameraControlsImpl.ACTION;
    controls.mouseButtons.left = ROTATE;
    controls.mouseButtons.right = ROTATE;
    controls.mouseButtons.middle = NONE;
    controls.mouseButtons.wheel = NONE;
  }, [controlsRef, enabled]);
}
