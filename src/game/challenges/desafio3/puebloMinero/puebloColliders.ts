import { orientedBox, type ColliderBox } from '@/game/engine/physics/colliderBoxes';

// Minimal cuboid colliders for what is left of the mining town: one box fitted to each object of PuebloMinero.glb
// (world coordinates; yaw of each box's long side in degrees). The grass and the small sign have none.
export const PUEBLO_COLLIDERS: readonly ColliderBox[] = [
  orientedBox('pueblo-choza-derrumbada', [91.76, 25.23, -200.59], [4.32, 1.48, 4.12], 44.9),
  orientedBox('pueblo-lapida-1', [83.32, 24.38, -193.98], [0.89, 0.67, 0.5], -18.3),
  orientedBox('pueblo-lapida-2', [81.77, 24.36, -196.32], [0.89, 0.67, 0.4], -23.6),
  orientedBox('pueblo-lapida-3', [81.13, 24.48, -199.16], [0.94, 0.69, 0.46], -16.1),
  orientedBox('pueblo-lapida-4', [85.61, 24.38, -196.33], [0.88, 0.64, 0.44], -20.4),
  orientedBox('pueblo-lapida-5', [84.25, 24.45, -198.73], [0.88, 0.68, 0.48], -18.4),
  orientedBox('pueblo-lapida-6', [83.66, 24.54, -201.36], [0.9, 0.67, 0.44], -24.1),
  orientedBox('pueblo-tunel-colapsado-1', [86.65, 26.85, -180.65], [2.12, 2.52, 1.56], 0),
  orientedBox('pueblo-tunel-colapsado-2', [113.31, 25.74, -195.95], [1.84, 1.8, 2.33], 0),
  orientedBox('pueblo-vagoneta', [111.2, 25, -192.71], [1.3, 1.28, 0.8], 66.6),
];
