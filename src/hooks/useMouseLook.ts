import { useEffect, type RefObject } from 'react';
import { CameraControlsImpl } from '@react-three/drei';
import type { EcctrlCameraControlsHandle } from 'ecctrl/camera';

// Cámara en tercera persona: gira solo mientras se mantiene presionado el clic (izquierdo o derecho) y se arrastra.
// La rueda y el clic del medio no hacen nada para que la cámara no se acerque, aleje ni desplace. El táctil queda igual.
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
