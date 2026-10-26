import { useEffect, useRef, type ReactNode } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Ecctrl, type EcctrlHandle } from 'ecctrl';
import { EcctrlCameraControls, type EcctrlCameraControlsHandle } from 'ecctrl/camera';
import { useButtonStore, useJoystickStore } from 'ecctrl/input';
import { Vector3 } from 'three';
import { useCameraColliderStore } from '@/game/engine/camera/cameraColliderStore';
import { PLAYER_BODY_NAME } from '@/game/engine/physics/bodies';
import { useIsMobile } from '@/hooks/useIsMobile';
import { isGameplayPaused } from '@/store/uiStore';
import type { Control } from './keyboardMap';
import { usePlayerStore, type PlayerAction, type Point } from './playerStore';
import { PLAYER_START, PLAYER_START_CAMERA_AZIMUTH, PLAYER_START_ROTATION_Y, RESPAWN_POINT } from './spawn';
import { useMouseLook } from './useMouseLook';

const CAPSULE_HALF_HEIGHT = 0.6;
const CAPSULE_RADIUS = 0.3;
// The avatar's feet sit at the bottom of the capsule.
const FEET_OFFSET: [number, number, number] = [0, -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.1), 0];

const CAMERA_DISTANCE = 2;
// Initial camera: behind the avatar, slightly above (polar angle measured from the zenith).
const CAMERA_START_POLAR = Math.PI * 0.42;
const CAMERA_MIN_POLAR = Math.PI * 0.15;
const CAMERA_MAX_POLAR = Math.PI * 0.55;
const CAMERA_TARGET_HEIGHT = 0.5;

// The Death clip lasts 2.37 s; a short pause follows before respawning.
const DEATH_RESPAWN_DELAY = 2.8;
// A joystick pushed this far counts as moving; past RUN it runs.
const JOYSTICK_DEADZONE = 0.05;
const JOYSTICK_RUN = 0.75;

const STAND_STILL = { forward: false, backward: false, leftward: false, rightward: false, run: false, jump: false, joystick: { x: 0, y: 0 } };
// Stable objects: @react-three/rapier resets the body to the (stale) object position when these props change identity,
// which would undo teleports such as respawning.
const PLAYER_USER_DATA = { name: PLAYER_BODY_NAME };
const START_POSITION: [number, number, number] = [PLAYER_START.x, PLAYER_START.y, PLAYER_START.z];
const START_ROTATION: [number, number, number] = [0, PLAYER_START_ROTATION_Y, 0];

type PlayerControllerProps = {
  children: ReactNode;
  // The player died and is back at the respawn point (the game decides what a defeat costs).
  onRespawn?: () => void;
};

// Third-person character controller (ecctrl): keyboard, joystick and virtual buttons move the capsule; the camera
// follows it. It also applies teleports, the camera distance override, the dialog pause and death → respawn.
export function PlayerController({ children, onRespawn }: PlayerControllerProps) {
  const [, getKeys] = useKeyboardControls<Control>();
  const ecctrlRef = useRef<EcctrlHandle>(null);
  const cameraControls = useRef<EcctrlCameraControlsHandle>(null);
  const camera = useThree((state) => state.camera);
  const cameraColliders = useCameraColliderStore((state) => state.colliders);
  const cameraUp = useRef(new Vector3());
  const cameraPlaced = useRef(false);
  const appliedCameraDistance = useRef<number | null>(null);
  const diedAt = useRef<number | null>(null);
  useMouseLook(cameraControls, !useIsMobile());

  useEffect(() => {
    if (cameraControls.current) cameraControls.current.colliderMeshes = cameraColliders;
  }, [cameraColliders]);

  // The player starts every visit at full health.
  useEffect(() => usePlayerStore.getState().reset(), []);

  const teleport = (point: Point) => {
    const body = ecctrlRef.current?.body;
    if (!body) return;
    body.setTranslation(point, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  };

  const applyCameraDistance = (distance: number | null) => {
    const controls = cameraControls.current;
    if (!controls || distance === appliedCameraDistance.current) return;
    appliedCameraDistance.current = distance;
    controls.minDistance = distance ?? CAMERA_DISTANCE;
    controls.dollyTo(distance ?? CAMERA_DISTANCE, true);
  };

  const followWithCamera = () => {
    const ecctrl = ecctrlRef.current;
    const controls = cameraControls.current;
    if (!ecctrl || !controls) return;
    const target = ecctrl.currPos;
    // camera-controls takes its distance and angle from the <Canvas> camera: the first time, snap it behind the avatar.
    if (!cameraPlaced.current) {
      cameraPlaced.current = true;
      controls.moveTo(target.x, target.y + CAMERA_TARGET_HEIGHT, target.z, false);
      controls.rotateTo(PLAYER_START_CAMERA_AZIMUTH, CAMERA_START_POLAR, false);
      controls.dollyTo(CAMERA_DISTANCE, false);
    }
    controls.moveTo(target.x, target.y + CAMERA_TARGET_HEIGHT, target.z, true);
    cameraUp.current.copy(ecctrl.upAxis);
    camera.up.lerp(cameraUp.current, 0.1);
    controls.setUp(camera.up);
  };

  useFrame((state) => {
    const ecctrl = ecctrlRef.current;
    const player = usePlayerStore.getState();
    if (!ecctrl) return;

    if (player.teleportRequest) {
      teleport(player.teleportRequest);
      player.clearTeleportRequest();
    }
    applyCameraDistance(player.cameraDistance);

    // Death: frozen while the Death clip plays, then back at the respawn point with full health.
    if (player.health <= 0) {
      diedAt.current ??= state.clock.elapsedTime;
      ecctrl.setMovement(STAND_STILL);
      if (state.clock.elapsedTime - diedAt.current > DEATH_RESPAWN_DELAY) {
        diedAt.current = null;
        player.setCameraDistance(null);
        teleport(RESPAWN_POINT);
        player.restoreHealth();
        onRespawn?.();
      }
      followWithCamera();
      return;
    }

    // A dialog or the backpack is open: the avatar stands still.
    if (isGameplayPaused()) {
      ecctrl.setMovement(STAND_STILL);
      if (player.action !== 'Idle') player.setAction('Idle');
      followWithCamera();
      return;
    }

    const keys = getKeys();
    const joystick = useJoystickStore.getState().joysticks['default'];
    const joystickX = joystick?.active ? joystick.x : 0;
    const joystickY = joystick?.active ? joystick.y : 0;
    const joystickPush = Math.hypot(joystickX, joystickY);
    const buttons = useButtonStore.getState().buttons;
    const run = keys.run || Boolean(buttons['run']);

    ecctrl.setMovement({
      forward: keys.forward,
      backward: keys.backward,
      leftward: keys.leftward,
      rightward: keys.rightward,
      run,
      jump: keys.jump || Boolean(buttons['jump']),
      joystick: { x: joystickX, y: joystickY },
    });

    const moving = keys.forward || keys.backward || keys.leftward || keys.rightward || joystickPush > JOYSTICK_DEADZONE;
    const action: PlayerAction = !moving ? 'Idle' : run || joystickPush > JOYSTICK_RUN ? 'Running' : 'Walking';
    if (player.action !== action) player.setAction(action);

    followWithCamera();
  });

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
        capsuleHalfHeight={CAPSULE_HALF_HEIGHT}
        capsuleRadius={CAPSULE_RADIUS}
        position={START_POSITION}
        rotation={START_ROTATION}
        friction={1}
        enableToggleRun={false}
        userData={PLAYER_USER_DATA}
      >
        <group position={FEET_OFFSET}>{children}</group>
      </Ecctrl>
    </>
  );
}
