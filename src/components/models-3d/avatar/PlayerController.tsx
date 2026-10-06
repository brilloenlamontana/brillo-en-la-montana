import React, { useCallback, useEffect, useRef } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Ecctrl } from 'ecctrl';
import { EcctrlCameraControls } from 'ecctrl/camera';
import type { EcctrlHandle } from 'ecctrl';
import type { EcctrlCameraControlsHandle } from 'ecctrl/camera';
import * as THREE from 'three';
import { useAvatarStore, type AvatarAction } from '../../../store/avatarStore';
import { useProgressStore } from '../../../store/progressStore';
import { useCameraColliderStore } from '../../../store/cameraColliderStore';
import { useJoystickStore, useButtonStore } from 'ecctrl/input';
import { VILLA_BOJ_RESPAWN } from '../../../constants/zones';
import { PLAYER_BODY_NAME } from '../../../constants/bodies';
import { usePantanoWells } from '../../../hooks/usePantanoWells';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useMouseLook } from '../../../hooks/useMouseLook';
import { findWellExit, findWellUnder, type Well } from '../../../utils/wells';

const CAMERA_DISTANCE = 2;
// Ángulo inicial de la cámara: detrás de la avatar (+z) y un poco por encima (polar medido desde arriba).
const CAMERA_START_AZIMUTH = 0;
const CAMERA_START_POLAR = Math.PI * 0.42;
const CAMERA_MIN_POLAR = Math.PI * 0.15;
const CAMERA_MAX_POLAR = Math.PI * 0.55;
const WELL_CAMERA_DISTANCE = 1.1;
const WELL_FALL_DEPTH = 1.5;
const DEATH_RESPAWN_DELAY = 2.8; // la animación Death dura 2.37 s; luego un respiro antes de reaparecer
const STAND_STILL = { forward: false, backward: false, leftward: false, rightward: false, run: false, jump: false, joystick: { x: 0, y: 0 } };
// Debe ser un objeto estable: si cambia entre renders, @react-three/rapier vuelve a poner el cuerpo en la posición
// de su objeto 3D (aún sin actualizar) y deshace cualquier teletransporte, como reaparecer en Villa Boj.
const PLAYER_USER_DATA = { name: PLAYER_BODY_NAME };
const PLAYER_START_POSITION: [number, number, number] = [0, 20, 0];

export const PlayerController = ({ children }: { children: React.ReactNode }) => {
  const [, get] = useKeyboardControls();
  const ecctrlRef = useRef<EcctrlHandle>(null);

  const cameraControls = useRef<EcctrlCameraControlsHandle>(null);
  const cameraUp = useRef(new THREE.Vector3());
  const camera = useThree((state) => state.camera);
  const cameraColliders = useCameraColliderStore(state => state.colliders);
  const wells = usePantanoWells();
  const wellFallen = useRef<Well | null>(null);
  const diedAt = useRef<number | null>(null);
  const cameraPlaced = useRef(false);
  const isMobile = useIsMobile();
  useMouseLook(cameraControls, !isMobile);

  useEffect(() => {
    if (cameraControls.current) cameraControls.current.colliderMeshes = cameraColliders;
  }, [cameraColliders]);

  const teleportTo = useCallback((position: { x: number; y: number; z: number }) => {
    const ecctrl = ecctrlRef.current;
    if (ecctrl) {
      ecctrl.body.setTranslation(position, true);
      ecctrl.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    wellFallen.current = null;
    useAvatarStore.getState().setTrappedInWell(false);
    const controls = cameraControls.current;
    if (controls) {
      controls.minDistance = CAMERA_DISTANCE;
      controls.dollyTo(CAMERA_DISTANCE, false);
    }
  }, []);

  const respawnAtVillaBoj = useCallback(() => teleportTo(VILLA_BOJ_RESPAWN), [teleportTo]);

  const followWithCamera = () => {
    if (!ecctrlRef.current || !cameraControls.current) return;
    const target = ecctrlRef.current.currPos;
    // camera-controls toma la distancia y el ángulo de la posición inicial del <Canvas> y solo aplica min/maxDistance
    // al hacer scroll; por eso la primera vez se coloca la cámara de golpe detrás de la avatar.
    if (!cameraPlaced.current) {
      cameraPlaced.current = true;
      cameraControls.current.moveTo(target.x, target.y + 0.5, target.z, false);
      cameraControls.current.rotateTo(CAMERA_START_AZIMUTH, CAMERA_START_POLAR, false);
      cameraControls.current.dollyTo(CAMERA_DISTANCE, false);
    }
    cameraControls.current.moveTo(target.x, target.y + 0.5, target.z, true);
    cameraUp.current.copy(ecctrlRef.current.upAxis);
    camera.up.lerp(cameraUp.current, 0.1);
    cameraControls.current.setUp(camera.up);
  };

  useFrame((state) => {
    // Muerte: se queda quieta mientras se reproduce Death (la pone takeDamage) y luego reaparece en Villa Boj con vida.
    if (useAvatarStore.getState().health <= 0) {
      diedAt.current ??= state.clock.elapsedTime;
      ecctrlRef.current?.setMovement(STAND_STILL);
      if (state.clock.elapsedTime - diedAt.current > DEATH_RESPAWN_DELAY) {
        respawnAtVillaBoj();
        useAvatarStore.getState().restoreHealth();
        diedAt.current = null;
      }
      followWithCamera();
      return;
    }

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

      // Caída en un pozo trampa: la cámara se pega al personaje (sin atravesar paredes). Sin soga es muerte
      // instantánea (animación Death y regreso a Villa Boj); con la soga queda atrapado hasta usarla desde la mochila.
      const { currPos } = ecctrl;
      if (wellFallen.current === null) {
        const well = findWellUnder(wells, currPos.x, currPos.y, currPos.z, WELL_FALL_DEPTH);
        if (well) {
          wellFallen.current = well;
          const controls = cameraControls.current;
          if (controls) {
            controls.minDistance = WELL_CAMERA_DISTANCE;
            controls.dollyTo(WELL_CAMERA_DISTANCE, true);
          }
          const avatar = useAvatarStore.getState();
          if (useProgressStore.getState().progress.collectedItems?.includes('soga')) avatar.setTrappedInWell(true);
          else avatar.takeDamage(avatar.maxHealth);
        }
      } else if (useAvatarStore.getState().climbRequested) {
        teleportTo(findWellExit(wellFallen.current, wells));
      }
    }

    followWithCamera();
  });

  const capsuleHalfHeight = 0.6;
  const capsuleRadius = 0.3;

  return (
    <>
      <EcctrlCameraControls
        ref={cameraControls}
        makeDefault
        smoothTime={0.1}
        minDistance={CAMERA_DISTANCE}
        maxDistance={CAMERA_DISTANCE}
        minPolarAngle={CAMERA_MIN_POLAR}
        maxPolarAngle={CAMERA_MAX_POLAR}
      />
      <Ecctrl
        ref={ecctrlRef}
        capsuleHalfHeight={capsuleHalfHeight}
        capsuleRadius={capsuleRadius}
        position={PLAYER_START_POSITION}
        friction={1}
        enableToggleRun={false}
        userData={PLAYER_USER_DATA}
      >
        <group position={[0, -(capsuleHalfHeight + capsuleRadius + 0.1), 0]}>
          {children}
        </group>
      </Ecctrl>
    </>
  );
};
