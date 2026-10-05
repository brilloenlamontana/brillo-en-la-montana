import { Vector3 } from 'three';

// La casa de Imeri viene girada -20° en el GLB. Sus colliders se escriben en coordenadas locales de la casa
// (x = profundidad con el porche en -x, z = ancho, y = altura absoluta) dentro de este marco.
export const HOUSE_POSITION: [number, number, number] = [20.013, 0, 45.197];
export const HOUSE_ROTATION_Y = -Math.PI / 9;

// La puerta está modelada abierta hacia adentro; para cerrarla se gira sobre su bisagra (marco izquierdo).
export const DOOR_NODE_NAME = 'ImeriPuerta';
const DOOR_HINGE_LOCAL = { x: -2.87, z: -0.33 };
export const DOOR_CLOSE_ROTATION = -Math.PI / 2;

export const DOOR_HINGE_WORLD = new Vector3(
  HOUSE_POSITION[0] + Math.cos(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.x + Math.sin(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.z,
  0,
  HOUSE_POSITION[2] - Math.sin(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.x + Math.cos(HOUSE_ROTATION_Y) * DOOR_HINGE_LOCAL.z,
);
