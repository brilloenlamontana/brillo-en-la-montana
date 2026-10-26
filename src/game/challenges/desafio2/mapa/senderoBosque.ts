type Point3 = readonly [number, number, number];

// Route from the Dark Forest entrance to its exit, past the hidden rock wall, toward Hedrig's town (world x, y, z).
// Computed offline with A* on a 1 m grid of Terreno.glb: it keeps 1.3 m clear of every trunk of BosqueArboles.glb,
// prefers ground away from their roots and avoids slopes steeper than 0.55. The heights are only a hint: the trail
// is laid on the terrain at runtime.
export const SENDERO_BOSQUE: readonly Point3[] = [
  [-31, 10.95, -163], [-27, 11.42, -176], [-25, 11.78, -182], [-23, 11.88, -184], [-21, 12, -186], [-19, 12.25, -188],
  [-16, 12.79, -190], [-14, 13.11, -192], [-12, 13.36, -194], [-9, 13.68, -195], [-6, 13.97, -196], [-3, 13.95, -196],
  [0, 13.93, -196], [3, 14, -196], [6, 14.04, -195], [8, 14.27, -193], [11, 13.92, -193], [14, 13.58, -193],
  [17, 13.16, -192], [24, 12.71, -191], [27, 12.36, -191], [30, 12.17, -191], [33, 12.15, -193], [35, 13.04, -195],
  [37, 14.27, -197], [40, 14.8, -197], [43, 15.44, -198], [46, 16.07, -198], [49, 16.7, -198], [51, 17.11, -200],
  [53, 17.53, -202], [55, 17.96, -204], [58, 18.58, -205], [61, 19.2, -205], [74, 21.92, -205], [80, 23.16, -205],
];
