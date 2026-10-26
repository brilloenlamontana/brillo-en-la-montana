import { Vector3 } from 'three';

// Imeri's house is rotated -20° in the GLB. Its colliders are defined in local house coordinates
// (x = depth with the porch at -x, z = width, y = absolute height) within this frame.
export const HOUSE_POSITION: [number, number, number] = [20.013, 0, 45.197];
const HOUSE_ROTATION_Y = -Math.PI / 9;
export const HOUSE_ROTATION: [number, number, number] = [0, HOUSE_ROTATION_Y, 0];

// The door is modeled open inward; to close it rotates on its hinge (left frame).
export const DOOR_NODE_NAME = 'ImeriPuerta';
const DOOR_HINGE_LOCAL = { x: -2.87, z: -0.33 };
export const DOOR_CLOSE_ROTATION = -Math.PI / 2;

export const DOOR_HINGE_WORLD = new Vector3(
  HOUSE_POSITION[0] + Math.cos(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.x + Math.sin(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.z,
  0,
  HOUSE_POSITION[2] - Math.sin(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.x + Math.cos(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.z,
);

