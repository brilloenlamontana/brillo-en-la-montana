import { ringBoxes, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { VILLA_BOJ_ZONE } from '@/game/world/geography';

// Measured on the GLBs in world coordinates; args are half-extents.
const BUILDINGS: ColliderBox[] = [
  { id: 'casa-anexo', position: [-80.85, 12.39, 31.19], args: [3.125, 2.4, 2.35] },
  { id: 'casa-entramado', position: [-99.43, 12.64, 32.12], args: [4.65, 2.4, 3.425] },
  { id: 'casa-grande', position: [-88.66, 12.5, 31.89], args: [3.925, 2.4, 5.15] },
  { id: 'casa-larga', position: [-87.66, 11.75, -3.03], args: [5.425, 2.4, 3.925] },
  { id: 'casa-pequena-1', position: [-109.73, 12.27, 28.22], args: [2.65, 2.4, 3.125] },
  { id: 'casa-pequena-2', position: [-109.66, 12.38, 1.6], args: [2.725, 2.4, 2.65] },
  { id: 'casa-pequena-3', position: [-69.93, 12.34, 33.62], args: [2.9, 2.4, 2.675] },
  { id: 'casa-trasera', position: [-100.93, 12.36, -1.83], args: [4.15, 2.4, 3.425] },
  { id: 'establo', position: [-65.93, 12.63, 1.17], args: [2.25, 2.4, 3.425] },
  { id: 'galpon', position: [-76.43, 12.06, 1.97], args: [2.85, 2.4, 4.425] },

  { id: 'iglesia-norte', position: [-104.63, 12.02, 8.25], args: [6.85, 2.4, 1.8] },
  { id: 'iglesia-nave', position: [-103.93, 12.02, 14.945], args: [8.3, 2.4, 4.895] },
  { id: 'iglesia-torre', position: [-113.83, 12.02, 14.895], args: [2.0, 2.4, 3.155] },
  { id: 'iglesia-abside', position: [-94.13, 12.02, 14.89], args: [1.9, 2.4, 2.65] },
  { id: 'iglesia-sur', position: [-99.73, 12.02, 21.74], args: [2.95, 2.4, 1.9] },

  { id: 'utileria-0', position: [-92.47, 10.915, 0.955], args: [0.67, 0.615, 0.465] },
  { id: 'utileria-1', position: [-89.43, 11.235, 25.895], args: [0.32, 0.935, 0.325] },
  { id: 'utileria-2', position: [-78.635, 10.98, 6.295], args: [0.605, 0.68, 0.605] },
  { id: 'utileria-3', position: [-77.465, 10.97, 28.93], args: [0.545, 0.67, 0.85] },
  { id: 'utileria-4', position: [-74.33, 11.105, 6.595], args: [0.32, 0.805, 0.325] },
  { id: 'utileria-5', position: [-70.73, 11.045, 30.895], args: [0.32, 0.745, 0.315] },
  { id: 'utileria-6', position: [-67.6, 11.105, 5.275], args: [0.74, 0.805, 0.595] },
  // The well in the square (round curb, r 1.04 m), as the box around it.
  { id: 'pozo-plaza', position: [-79.93, 12.235, 19.1], args: [1.04, 1.635, 1.04] },

  // Gate posts. The leaves have their own colliders in Porton.tsx because they open and close.
  { id: 'porton-poste-int-der', position: [-56.93, 12.76, 12.57], args: [0.23, 3.17, 0.22] },
  { id: 'porton-poste-int-izq', position: [-56.93, 12.76, 17.215], args: [0.23, 3.17, 0.22] },
  { id: 'porton-poste-ext-der', position: [-53.93, 12.76, 12.57], args: [0.23, 3.17, 0.22] },
  { id: 'porton-poste-ext-izq', position: [-53.93, 12.76, 17.215], args: [0.23, 3.17, 0.22] },
];

// Palisade: a ring of boxes tangent to its circle, leaving the gate open (around 0°, the +x side).
const PALISADE_OUTER_RADIUS = 33.29;
const PALISADE_INNER_RADIUS = 32.78;
const PALISADE_SEGMENTS = 36;
const GATE_HALF_ANGLE = (4.08 * Math.PI) / 180;
const SEGMENT_ANGLE = (2 * Math.PI - 2 * GATE_HALF_ANGLE) / PALISADE_SEGMENTS;
// Inner face measured at the segment ends, so the flat boxes never poke into the village.
const INNER_AT_EDGE = PALISADE_INNER_RADIUS * Math.cos(SEGMENT_ANGLE / 2);
const PALISADE = ringBoxes('empalizada', VILLA_BOJ_ZONE.center, INNER_AT_EDGE, PALISADE_OUTER_RADIUS - INNER_AT_EDGE, 9.4, 15.8, {
  segments: PALISADE_SEGMENTS,
  fromAngle: GATE_HALF_ANGLE,
  toAngle: 2 * Math.PI - GATE_HALF_ANGLE,
});

export const VILLA_COLLIDER_BOXES: ColliderBox[] = [...BUILDINGS, ...PALISADE];
