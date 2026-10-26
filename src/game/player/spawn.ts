import type { Point, Spawn } from './playerStore';

// Game start: on the road in front of the Villa Boj gate, facing the mayor's letter. The terrain is at ~10.7; the body
// spawns a bit higher and settles. Turned -90° the avatar faces -x, toward the letter and the gate.
export const PLAYER_START: Spawn = { x: -39, y: 12.4, z: 18, yaw: -Math.PI / 2 };

// Where the player comes back after dying: the Villa Boj square, free of buildings, slightly above the ground (10.7).
export const RESPAWN_POINT: Point = { x: -84, y: 12.5, z: 12 };

// Camera azimuth for camera-controls (0 = camera on +z) that puts it right behind an avatar facing `yaw`.
export const cameraAzimuthBehind = (yaw: number) => yaw + Math.PI;
