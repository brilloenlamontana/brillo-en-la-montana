// Places of Challenge 3 inside the Summit tunnels (world coordinates, y up), from the tunnel network of Map.blend
// (`tuneles_red.json`: milestones and exit pit).

type Point3 = readonly [number, number, number];

// Hito 1 — the chamber where the girl's spectre waits (floor).
export const CAMARA_SIMONA: Point3 = [129.9, 29.75, -178];

// Hito 3 — the Ogre's hall (floor at 42.5): once beaten he stands east of the arm-wrestling table; the player
// challenges him from the west side.
export const OGRO_POSITION: Point3 = [117.0, 42.5, -169.2];
export const MESA_PULSO: Point3 = [115.33, 42.5, -169.49];
// Arm wrestling: he stands against the east side of the table, leans over it and plants his right elbow on it (his
// clips of Ogro.blend are made for this spot); with the arms level the heel of his hand is at PULSO_REF. The avatar
// rests its right elbow on the table at PULSO_CODO and takes his hand, palm to palm.
export const OGRO_PULSO: Point3 = [116.15, 42.5, -169.2];
export const PULSO_REF: Point3 = [115.09, 44.01, -169.574];
export const PULSO_CODO: Point3 = [114.95, 43.78, -169.51];
// The avatar's way to its side of the table (x, z): it comes round to the west and steps up to the edge facing him.
export const PULSO_CAMINO: readonly (readonly [number, number])[] = [
  [113.7, -169.6],
  [114.38, -169.6],
];
// Which way the avatar faces at the table: +x, at him (yaw around +y; 0 faces +z).
export const PULSO_YAW = Math.PI / 2;
// The camera during the arm wrestling: close and high, off the avatar's right shoulder, looking down at the two hands
// over the table with the Ogre across it; the arms are seen going down to the left (the avatar wins) or to the right.
export const PULSO_CAMARA = { position: [114.0, 44.95, -168.3], lookAt: [115.1, 43.95, -169.55] } as const;
// Where the Ogre stands guard while nobody has beaten him: right in front of the stairs, blocking them (hall floor).
export const OGRO_GUARDIA: Point3 = [113.9, 42.5, -173.1];
// Foot of the stairs that climb to the summit, at the south-west corner of the hall.
export const ESCALERA_PIE: Point3 = [113.6, 42.5, -174.4];
// Where the Ogre throws back whoever tries to get past him (capsule center, over the hall floor).
export const OGRO_REPEL_POINT = { x: 112.2, y: 44, z: -166.6 } as const;

// Feet between these heights are in the Ogre's hall (a gallery loops right under it).
export const OGRO_HALL_Y: readonly [number, number] = [41.5, 46.5];
