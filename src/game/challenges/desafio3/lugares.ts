// Places of Challenge 3 inside the Summit tunnels (world coordinates, y up), from the tunnel network of Map.blend
// (`tuneles_red.json`: milestones and exit pit).

type Point3 = readonly [number, number, number];

// Hito 1 — the chamber where the girl's spectre waits (floor).
export const CAMARA_SIMONA: Point3 = [129.9, 29.75, -178];

// Hito 3 — the Ogre's hall (floor at 42.5): he stands on the wooden platform east of the arm-wrestling table and the
// player challenges him from the west side.
export const OGRO_POSITION: Point3 = [117.7, 43.75, -169.49];
export const MESA_PULSO: Point3 = [115.33, 42.5, -169.49];
// Where the Ogre stands guard while nobody has beaten him: right in front of the stairs, blocking them (hall floor).
export const OGRO_GUARDIA: Point3 = [113.9, 42.5, -173.1];
// Foot of the stairs that climb to the summit, at the south-west corner of the hall.
export const ESCALERA_PIE: Point3 = [113.6, 42.5, -174.4];
// Where the Ogre throws back whoever tries to get past him (capsule center, over the hall floor).
export const OGRO_REPEL_POINT = { x: 112.2, y: 44, z: -166.6 } as const;

// Feet between these heights are in the Ogre's hall (a gallery loops right under it).
export const OGRO_HALL_Y: readonly [number, number] = [41.5, 46.5];
