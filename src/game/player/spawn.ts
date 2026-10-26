import type { Point } from './playerStore';

// Game start: on the road in front of the Villa Boj gate, facing the mayor's letter. The terrain is at ~10.7; the body
// spawns a bit higher and settles.
export const PLAYER_START: Point = { x: -39, y: 12.4, z: 18 };
// The avatar faces +z in model space; turned -90° it faces -x, toward the letter and the gate.
export const PLAYER_START_ROTATION_Y = -Math.PI / 2;
// Camera azimuth for camera-controls (0 = camera on +z): pi/2 puts it on +x, behind the avatar.
export const PLAYER_START_CAMERA_AZIMUTH = Math.PI / 2;

// Where the player comes back after dying: the Villa Boj square, free of buildings, slightly above the ground (10.7).
export const RESPAWN_POINT: Point = { x: -84, y: 12.5, z: 12 };
