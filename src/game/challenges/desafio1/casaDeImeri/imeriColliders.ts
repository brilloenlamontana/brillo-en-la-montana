import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';

// In the house frame (houseFrame.ts: x = depth with the porch at -x, z = width, y = absolute height); args are
// half-extents measured on the GLBs.
export const HOUSE_BOXES: ColliderBox[] = [
  { id: 'piso-porche', position: [-4.14, 10.3, -0.05], args: [1.06, 0.4, 3.65] },
  { id: 'rampa-escalera', position: [-5.615, 10.307, 0.2], args: [0.563, 0.1, 0.7], rotation: [0, 0, 0.583] },

  { id: 'baranda-frente-izq', position: [-5.1, 11.175, -2.075], args: [0.1, 0.475, 1.575] },
  { id: 'baranda-frente-der', position: [-5.1, 11.175, 2.25], args: [0.1, 0.475, 1.35] },
  { id: 'baranda-lado-izq', position: [-4.14, 11.175, -3.5], args: [1.06, 0.475, 0.1] },
  { id: 'baranda-lado-der', position: [-4.14, 11.175, 3.45], args: [1.06, 0.475, 0.1] },

  { id: 'pared-fondo', position: [2.975, 12.1, 0], args: [0.105, 1.7, 3.58] },
  { id: 'pared-izq', position: [0, 12.1, -3.465], args: [3.08, 1.7, 0.105] },
  { id: 'pared-der', position: [0, 12.1, 3.45], args: [3.08, 1.7, 0.13] },
  { id: 'pared-frente-izq', position: [-2.95, 12.1, -1.95], args: [0.13, 1.7, 1.62] },
  { id: 'pared-frente-der', position: [-2.95, 12.1, 2.15], args: [0.13, 1.7, 1.43] },
  { id: 'dintel-puerta', position: [-2.95, 13.33, 0.195], args: [0.13, 0.47, 0.525] },

  { id: 'maceta-porche', position: [-3.425, 11.095, -0.775], args: [0.325, 0.405, 0.305] },
  { id: 'maceta-suelo-izq', position: [-6.245, 10.445, -1.005], args: [0.355, 0.405, 0.275] },
  { id: 'maceta-suelo-der', position: [-6.21, 10.435, 1.405], args: [0.29, 0.405, 0.345] },

  { id: 'piso-interior', position: [0, 10.35, 0], args: [3.08, 0.45, 3.58] },
  { id: 'cielo', position: [0.025, 13.65, -0.02], args: [2.85, 0.15, 3.34] },
  { id: 'baul', position: [-0.43, 11.355, -2.9], args: [1.37, 0.555, 0.46] },
  { id: 'barriles', position: [-2.42, 11.25, -2.96], args: [0.32, 0.45, 0.32] },
  { id: 'mesa', position: [-0.28, 11.22, 2.4], args: [1.15, 0.42, 0.52] },
];

// The camera collides only with walls and ceiling: furniture and pots would make it zoom in abruptly.
export const HOUSE_CAMERA_BOXES = HOUSE_BOXES.filter(({ id }) => /^(pared|dintel|cielo)/.test(id));
