import React, { useRef } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Ecctrl } from 'ecctrl';
import { EcctrlCameraControls } from 'ecctrl/camera';
import type { EcctrlHandle } from 'ecctrl';
import type { EcctrlCameraControlsHandle } from 'ecctrl/camera';
import * as THREE from 'three';
import { useAvatarStore, type AvatarAction } from '../../store/avatarStore';
import { useJoystickStore, useButtonStore } from 'ecctrl/input';

export const PlayerController = ({ children }: { children: React.ReactNode }) => {
  const [, get] = useKeyboardControls();
  const ecctrlRef = useRef<EcctrlHandle>(null);
  
  const cameraControls = useRef<EcctrlCameraControlsHandle>(null);
  const cameraUp = useRef(new THREE.Vector3());
  const { camera } = useThree();

  useFrame(() => {
    const { forward, backward, leftward, rightward, run, jump } = get() as any;
    
    // Read mobile joystick
    const joystickState = useJoystickStore.getState().joysticks['default'];
    const joystickX = joystickState?.active ? joystickState.x : 0;
    const joystickY = joystickState?.active ? joystickState.y : 0;

    // Read virtual buttons
    const buttonJump = useButtonStore.getState().buttons['jump'] || false;
    const buttonRun = useButtonStore.getState().buttons['run'] || false;

    const isRunning = Boolean(run || buttonRun);
    const isJumping = Boolean(jump || buttonJump);

    ecctrlRef.current?.setMovement({
      forward,
      backward,
      leftward,
      rightward,
      run: isRunning,
      jump: isJumping,
      joystick: { x: joystickX, y: joystickY },
    });
    
    const ecctrl = ecctrlRef.current;
    if (ecctrl) {
      let newAction: AvatarAction = 'Idle';
      const hasKeyMove = Boolean(forward || backward || leftward || rightward);
      const joyDistance = Math.hypot(joystickX, joystickY);
      const hasJoyMove = Boolean(joystickState?.active && joyDistance > 0.05);

      if (hasKeyMove || hasJoyMove) {
        // Run if run button is pressed, shift key is held, or joystick is pushed to max
        const shouldRun = isRunning || joyDistance > 0.75;
        newAction = shouldRun ? 'Running' : 'Walking';
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
