import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Ecctrl, type EcctrlHandle } from 'ecctrl';
import { EcctrlCameraControls, type EcctrlCameraControlsHandle } from 'ecctrl/camera';
import { useButtonStore, useJoystickStore } from 'ecctrl/input';
import { MathUtils, Vector3 } from 'three';
import { findCharacter } from '@/data/characters';
import { useCameraColliderStore } from '@/game/engine/camera/cameraColliderStore';
import { isBodyNamed, LIMIT_BODY_NAME, PLAYER_BODY_NAME } from '@/game/engine/physics/bodies';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/authStore';
import { isGameplayPaused } from '@/store/uiStore';
import type { Control } from './keyboardMap';
import { usePlayerStore, type PlayerAction, type Point, type Spawn } from './playerStore';
import { cameraAzimuthBehind, PLAYER_START, RESPAWN_POINT } from './spawn';
import { useMouseLook } from './useMouseLook';

const CAPSULE_HALF_HEIGHT = 0.6;
const CAPSULE_RADIUS = 0.3;
// The avatar's feet sit at the bottom of the capsule.
const FEET_OFFSET: [number, number, number] = [0, -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.1), 0];

// Jump: ecctrl only pushes up for `jumpDuration`, and while its ground ray still reaches the floor its floating spring
// pulls the capsule back down. With the default ray (1.3 m for this taller capsule) a jump was cut at 0.2 m, standing or
// running; a shorter ray and a longer push give a real jump of about 1 m at any speed.
const JUMP_VELOCITY = 3.3;
const JUMP_SECONDS = 0.28;
const GROUND_RAY_LENGTH = 0.8;

const CAMERA_DISTANCE = 2;
// The camera never goes through anything solid. Every frame the line of sight from the avatar's head to where the
// camera wants to be is tested against the physics world (the fixed colliders: ground, walls, houses, trunks, rocks,
// statues; not enemies, sensors nor the invisible walls of the map's edge), along its middle and around it (CAMERA_PROBE m to each side, above and below, so
// a wall beside the view counts too). If something is in the way the camera comes in front of it at once, CAMERA_SKIN
// short of it and no nearer than CAMERA_NEAREST to the head, and goes back out smoothly (CAMERA_EASE_OUT, 1/s) once the
// way is clear.
const CAMERA_PROBE = 0.24;
const CAMERA_SKIN = 0.28;
const CAMERA_NEAREST = 0.45;
const CAMERA_EASE_OUT = 5;
const CAMERA_PROBES: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
// Initial camera: behind the avatar, slightly above (polar angle measured from the zenith).
const CAMERA_START_POLAR = Math.PI * 0.42;
const CAMERA_MIN_POLAR = Math.PI * 0.15;
const CAMERA_MAX_POLAR = Math.PI * 0.55;
// The camera aims near the head: this fraction of the character's height above its feet.
const CAMERA_TARGET_FRACTION = 0.86;

// What the camera collides with: everything fixed except the invisible walls of the map's edge.
const seenByCamera = (collider: { parent: () => { userData?: unknown } | null }) => !isBodyNamed(collider.parent()?.userData, LIMIT_BODY_NAME);

// The Death clip lasts 3.63 s; a short pause follows before respawning.
const DEATH_RESPAWN_DELAY = 4.1;
// A joystick pushed this far counts as moving; past RUN it runs (same speeds as walking and Shift on a keyboard).
const JOYSTICK_DEADZONE = 0.05;
const JOYSTICK_RUN = 0.75;
// A guided walk (playerStore.guide) stops this close to its target (m).
const GUIDE_ARRIVE = 0.18;
// Guided and moving less than GUIDE_STUCK_METERS in GUIDE_STUCK_SECONDS: something low is in the way.
const GUIDE_STUCK_SECONDS = 0.45;
const GUIDE_STUCK_METERS = 0.12;

const STAND_STILL = { forward: false, backward: false, leftward: false, rightward: false, run: false, jump: false, joystick: { x: 0, y: 0 } };
// Stable objects: @react-three/rapier resets the body to the (stale) object position when these props change identity,
// which would undo teleports such as respawning.
const PLAYER_USER_DATA = { name: PLAYER_BODY_NAME };

type PlayerControllerProps = {
  children: ReactNode;
  // Where the avatar appears when the world opens (the checkpoint of the saved progress); read once.
  start?: Spawn;
  // The player died: the game decides what the defeat costs and where the player comes back (RESPAWN_POINT if omitted).
  onRespawn?: () => Point;
};

// Third-person character controller (ecctrl): keyboard, joystick and virtual buttons move the capsule; the camera
// follows it and never goes through anything solid (see CAMERA_PROBE). It also applies teleports, the camera distance
// override, the dialog pause and death → respawn.
export function PlayerController({ children, start = PLAYER_START, onRespawn }: PlayerControllerProps) {
  // Frozen at mount (see PLAYER_USER_DATA): a later progress change must not move the body back here.
  const [initial] = useState(() => ({
    position: [start.x, start.y, start.z] as [number, number, number],
    rotation: [0, start.yaw, 0] as [number, number, number],
    cameraAzimuth: cameraAzimuthBehind(start.yaw),
  }));
  const [, getKeys] = useKeyboardControls<Control>();
  const ecctrlRef = useRef<EcctrlHandle>(null);
  const cameraControls = useRef<EcctrlCameraControlsHandle>(null);
  const camera = useThree((state) => state.camera);
  const cameraColliders = useCameraColliderStore((state) => state.colliders);
  const cameraUp = useRef(new Vector3());
  const cameraPlaced = useRef(false);
  const { world, rapier } = useRapier();
  // The line of sight of the camera: the distance it is kept at, and scratch values.
  const sight = useRef({ distance: CAMERA_DISTANCE, applied: -1, target: new Vector3(), back: new Vector3(), right: new Vector3(), above: new Vector3(), to: new Vector3() });
  const diedAt = useRef<number | null>(null);
  const guideForward = useRef(new Vector3());
  const guideStuck = useRef({ since: 0, x: 0, z: 0, jump: false });
  // Every character uses the same capsule; only the point the camera looks at follows the character's height.
  const avatarName = useAuthStore((state) => state.user?.avatarName);
  const cameraTargetHeight = findCharacter(avatarName).height * CAMERA_TARGET_FRACTION + FEET_OFFSET[1];
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

  // How far behind the avatar's head the camera can be without anything solid in between, up to `wanted` (m).
  const clearCameraDistance = (wanted: number) => {
    const controls = cameraControls.current;
    if (!controls) return wanted;
    const { target, back, right, above, to } = sight.current;
    controls.getTarget(target);
    // From the head toward the camera, by the angles the controls hold (whatever a scene does with the camera itself).
    const polar = controls.polarAngle;
    const azimuth = controls.azimuthAngle;
    back.set(Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth));
    right.set(Math.cos(azimuth), 0, -Math.sin(azimuth));
    above.crossVectors(back, right);
    const flags = rapier.QueryFilterFlags.ONLY_FIXED | rapier.QueryFilterFlags.EXCLUDE_SENSORS;
    let clear = wanted;
    for (const [aside, up] of CAMERA_PROBES) {
      to.copy(back).multiplyScalar(wanted).addScaledVector(right, aside * CAMERA_PROBE).addScaledVector(above, up * CAMERA_PROBE);
      const length = to.length();
      to.divideScalar(length);
      const hit = world.castRay(new rapier.Ray(target, to), length, true, flags, undefined, undefined, undefined, seenByCamera);
      // (As a distance along the middle of the view.)
      if (hit) clear = Math.min(clear, (hit.timeOfImpact * wanted) / length);
    }
    return clear < wanted ? Math.max(Math.min(CAMERA_NEAREST, wanted), clear - CAMERA_SKIN) : wanted;
  };

  // Keeps the camera at the distance asked for (playerStore.cameraDistance, or the usual one), or nearer when
  // something solid is in the way: it comes in at once and goes back out smoothly.
  const applyCameraDistance = (wanted: number, delta: number) => {
    const controls = cameraControls.current;
    if (!controls) return;
    const view = sight.current;
    const clear = clearCameraDistance(wanted);
    view.distance = clear < view.distance ? clear : MathUtils.damp(view.distance, clear, CAMERA_EASE_OUT, delta);
    if (Math.abs(view.distance - view.applied) < 0.002) return;
    view.applied = view.distance;
    controls.minDistance = view.distance;
    controls.maxDistance = view.distance;
    controls.dollyTo(view.distance, false);
  };

  const followWithCamera = () => {
    const ecctrl = ecctrlRef.current;
    const controls = cameraControls.current;
    if (!ecctrl || !controls) return;
    const target = ecctrl.currPos;
    // camera-controls takes its distance and angle from the <Canvas> camera: the first time, snap it behind the avatar.
    if (!cameraPlaced.current) {
      cameraPlaced.current = true;
      controls.moveTo(target.x, target.y + cameraTargetHeight, target.z, false);
      controls.rotateTo(initial.cameraAzimuth, CAMERA_START_POLAR, false);
      controls.dollyTo(CAMERA_DISTANCE, false);
    }
    controls.moveTo(target.x, target.y + cameraTargetHeight, target.z, true);
    cameraUp.current.copy(ecctrl.upAxis);
    camera.up.lerp(cameraUp.current, 0.1);
    controls.setUp(camera.up);
  };

  useFrame((state, delta) => {
    const ecctrl = ecctrlRef.current;
    const player = usePlayerStore.getState();
    if (!ecctrl) return;

    if (player.teleportRequest) {
      teleport(player.teleportRequest);
      player.clearTeleportRequest();
    }
    if (cameraPlaced.current) applyCameraDistance(player.cameraDistance ?? CAMERA_DISTANCE, Math.min(delta, 0.1));

    // Death: frozen while the Death clip plays, then back at the respawn point with full health.
    if (player.health <= 0) {
      diedAt.current ??= state.clock.elapsedTime;
      ecctrl.setMovement(STAND_STILL);
      if (state.clock.elapsedTime - diedAt.current > DEATH_RESPAWN_DELAY) {
        diedAt.current = null;
        player.setCameraDistance(null);
        teleport(onRespawn?.() ?? RESPAWN_POINT);
        player.restoreHealth();
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

    // A scripted scene leads the avatar (see playerStore.guide): it walks to the point by itself, whatever the camera
    // looks at, and the keys do nothing.
    if (player.guide) {
      const target = player.guide.walkTo;
      const dx = target ? target.x - ecctrl.currPos.x : 0;
      const dz = target ? target.z - ecctrl.currPos.z : 0;
      const distance = Math.hypot(dx, dz);
      const walking = distance > GUIDE_ARRIVE;
      if (walking) {
        // ecctrl moves relative to the camera: the world direction is turned into "joystick" axes of the camera.
        camera.getWorldDirection(guideForward.current);
        const { x: fx, z: fz } = guideForward.current;
        const flat = Math.hypot(fx, fz) || 1;
        const ux = dx / distance;
        const uz = dz / distance;
        // Held back by a step (the stairs of the sanctuary): it hops over it, as a player would.
        const stuck = guideStuck.current;
        if (state.clock.elapsedTime - stuck.since > GUIDE_STUCK_SECONDS) {
          stuck.jump = Math.hypot(ecctrl.currPos.x - stuck.x, ecctrl.currPos.z - stuck.z) < GUIDE_STUCK_METERS;
          stuck.since = state.clock.elapsedTime;
          stuck.x = ecctrl.currPos.x;
          stuck.z = ecctrl.currPos.z;
        } else if (state.clock.elapsedTime - stuck.since > 0.12) {
          stuck.jump = false;
        }
        ecctrl.setMovement({ ...STAND_STILL, jump: stuck.jump, joystick: { x: (ux * -fz + uz * fx) / flat, y: (ux * fx + uz * fz) / flat } });
      } else {
        ecctrl.setMovement(STAND_STILL);
      }
      const guided: PlayerAction = walking ? 'Walking' : 'Idle';
      if (player.action !== guided) player.setAction(guided);
      followWithCamera();
      return;
    }

    const keys = getKeys();
    const joystick = useJoystickStore.getState().joysticks['default'];
    const joystickX = joystick?.active ? joystick.x : 0;
    const joystickY = joystick?.active ? joystick.y : 0;
    const joystickPush = Math.hypot(joystickX, joystickY);
    const buttons = useButtonStore.getState().buttons;
    // ecctrl ignores how far the joystick is pushed (it only takes its direction), so the push itself chooses between
    // walking and running: a phone reaches exactly the keyboard's walking and running speeds.
    const run = keys.run || Boolean(buttons['run']) || joystickPush > JOYSTICK_RUN;

    ecctrl.setMovement({
      forward: keys.forward,
      backward: keys.backward,
      leftward: keys.leftward,
      rightward: keys.rightward,
      run,
      jump: keys.jump || Boolean(buttons['jump']),
      joystick: joystickPush > JOYSTICK_DEADZONE ? { x: joystickX, y: joystickY } : STAND_STILL.joystick,
    });

    const moving = keys.forward || keys.backward || keys.leftward || keys.rightward || joystickPush > JOYSTICK_DEADZONE;
    const action: PlayerAction = !moving ? 'Idle' : run ? 'Running' : 'Walking';
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
        position={initial.position}
        rotation={initial.rotation}
        friction={1}
        enableToggleRun={false}
        jumpVel={JUMP_VELOCITY}
        jumpDuration={JUMP_SECONDS}
        rayLength={GROUND_RAY_LENGTH}
        userData={PLAYER_USER_DATA}
      >
        <group position={FEET_OFFSET}>{children}</group>
      </Ecctrl>
    </>
  );
}
