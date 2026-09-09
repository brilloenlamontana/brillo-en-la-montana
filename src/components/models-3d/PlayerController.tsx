import React, { useRef } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Ecctrl } from 'ecctrl';
import { EcctrlCameraControls } from 'ecctrl/camera';
import type { EcctrlHandle } from 'ecctrl';
import type { EcctrlCameraControlsHandle } from 'ecctrl/camera';
import * as THREE from 'three';
import { useAvatarStore, type AvatarAction } from '../../store/avatarStore';

export const PlayerController = ({ children }: { children: React.ReactNode }) => {
  const [, get] = useKeyboardControls();
  const ecctrlRef = useRef<EcctrlHandle>(null);
  
  const cameraControls = useRef<EcctrlCameraControlsHandle>(null);
  const cameraUp = useRef(new THREE.Vector3());
  const { camera } = useThree();

  useFrame(() => {
    const { forward, backward, leftward, rightward, run } = get() as any;
    ecctrlRef.current?.setMovement({
      forward,
      backward,
      leftward,
      rightward,
      run,
    });
    
    const ecctrl = ecctrlRef.current;
    if (ecctrl) {
      let newAction: AvatarAction = 'Idle';
      if (forward || backward || leftward || rightward) {
        newAction = run ? 'Running' : 'Walking';
      }
      
      const currentAction = useAvatarStore.getState().action;
      if (currentAction !== newAction) {
        useAvatarStore.getState().setAction(newAction);
      }
    }
    
    if (!ecctrlRef.current || !cameraControls.current) return;
    
    const target = ecctrlRef.current.currPos;
    cameraControls.current.moveTo(target.x, target.y + 0.5, target.z, true);
    
    cameraUp.current.copy(ecctrlRef.current.upAxis);
    camera.up.lerp(cameraUp.current, 0.1);
    cameraControls.current.setUp(camera.up);
  });

  const capsuleHalfHeight = 0.6;
  const capsuleRadius = 0.3;

  return (
    <>
      <EcctrlCameraControls 
        ref={cameraControls} 
        makeDefault 
        smoothTime={0.1} 
        minDistance={2} 
        maxDistance={2} 
      />
      <Ecctrl 
        ref={ecctrlRef} 
        capsuleHalfHeight={capsuleHalfHeight} 
        capsuleRadius={capsuleRadius}
      >
        <group position={[0, -(capsuleHalfHeight + capsuleRadius), 0]}>
          {children}
        </group>
      </Ecctrl>
    </>
  );
};
