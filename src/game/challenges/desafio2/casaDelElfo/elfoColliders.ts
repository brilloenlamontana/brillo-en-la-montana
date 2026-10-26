import { directionXZ, orientedBox, segmentBox, wallBox, type ColliderBox, type Point2, type Point3 } from '@/game/engine/physics/colliderBoxes';

// Minimal cuboid colliders for the elf house: only where the avatar walks or bumps into something. Measured from
// ElfoExterior.glb, ElfoInterior.glb and ArbolGigante.glb (world coordinates, y up).

const DECK_Y = 21.698;

// Spiral staircase: centerline through the top of the treads, from the ground to the deck (every 4 treads).
const STAIR_PATH: Point3[] = [
  [-42.04, 10.2, -142.43], [-41.67, 10.46, -142.67], [-40.07, 11.44, -143.32], [-38.37, 12.41, -143.51], [-36.63, 13.39, -143.24],
  [-35.1, 14.37, -142.51], [-33.69, 15.35, -141.62], [-32.62, 16.32, -140.35], [-31.99, 17.3, -138.81], [-31.86, 18.28, -137.09],
  [-32.24, 19.25, -135.46], [-33.1, 20.23, -134.04], [-34.36, 21.21, -132.95], [-34.72, 21.45, -132.74],
  // landing at deck height, up to the gap in the deck railing
  [-35.9, DECK_Y, -132.42], [-35.62, DECK_Y, -133],
];
const STAIR_HALF_WIDTH = 0.75;
const RAIL_OFFSET = 0.8;
const RAIL_HALF_HEIGHT = 0.55;
// The top stretch (13) runs at deck height along the outside of the deck edge, and the landing (14) turns 90° into the
// gap of the deck railing. Their railings toward the way would stand across it: 13's on the deck side (the deck's own
// railing takes over) and the landing's on the side the stair arrives from.
const OPEN_RAILINGS = new Set(['escalera-13-baranda1', 'escalera-14-baranda1']);

function stairBoxes(): ColliderBox[] {
  const boxes: ColliderBox[] = [];
  for (let i = 0; i < STAIR_PATH.length - 1; i++) {
    const a = STAIR_PATH[i];
    const b = STAIR_PATH[i + 1];
    boxes.push(segmentBox(`escalera-${i}`, a, b, STAIR_HALF_WIDTH, 0.1, -0.1, 0.12));
    const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz);
    const [nx, nz] = [-dz / length, dx / length];
    // Railings on both sides, so the avatar falls neither toward the trunk nor outward.
    for (const side of [-1, 1]) {
      const id = `escalera-${i}-baranda${side}`;
      if (OPEN_RAILINGS.has(id)) continue;
      const offset = (p: Point3): Point3 => [p[0] + side * RAIL_OFFSET * nx, p[1], p[2] + side * RAIL_OFFSET * nz];
      boxes.push(segmentBox(id, offset(a), offset(b), 0.05, RAIL_HALF_HEIGHT, RAIL_HALF_HEIGHT, 0.15));
    }
  }
  return boxes;
}

// Octagonal deck (irregular: each pair of opposite faces has its own apothem; checked against the hull of
// ElfoPlataforma). Two crossed squares would make an eight-pointed star, so it is the union of four bands instead:
// each spans one pair of opposite faces and is as wide as those faces' sides, its corners on the deck's corners.
// [face°, apothem, side from, side to]; side measured along the face (local z), from the deck center.
// The stairs climb 0.22 m from the corner at 46°: the two bands meeting there stop short of it (by trims measured with
// a capsule walk), so the avatar's head does not catch on it; the railing keeps the avatar 0.45 m from the deck edge,
// where the deck is still fully covered.
const DECK_CENTER: Point2 = [-37.21, -137.16];
const STAIR_CORNER_TRIM = { band24: 0.2, band69: 0.3 };
const DECK_BANDS: [faceDeg: number, apothem: number, sideFrom: number, sideTo: number][] = [
  [24, 4.57, -1.674, 1.674 - STAIR_CORNER_TRIM.band24],
  [69, 4.415, -2.047 + STAIR_CORNER_TRIM.band69, 2.047],
  [114, 4.57, -1.674, 1.674],
  [159, 4.515, -1.947, 1.947],
];
// Stair corner of the deck (RAILING[0] side) and a small square on its bisector that fills, 0.46 m or more inside the
// edges, the floor the trimmed bands leave uncovered.
const STAIR_CORNER: Point2 = [-33.72, -133.77];
const CORNER_FILL_DISTANCE = 0.85;
const CORNER_FILL_HALF = 0.25;
const CORNER_FILL: ColliderBox = (() => {
  const [dx, dz] = [DECK_CENTER[0] - STAIR_CORNER[0], DECK_CENTER[1] - STAIR_CORNER[1]];
  const length = Math.hypot(dx, dz);
  const center: Point3 = [STAIR_CORNER[0] + (dx / length) * CORNER_FILL_DISTANCE, DECK_Y - 0.15, STAIR_CORNER[1] + (dz / length) * CORNER_FILL_DISTANCE];
  return orientedBox('plataforma-esquina-escalera', center, [CORNER_FILL_HALF, 0.15, CORNER_FILL_HALF], (Math.atan2(dz, dx) * 180) / Math.PI);
})();
const DECK_BOXES: ColliderBox[] = [
  ...DECK_BANDS.map(([deg, apothem, sideFrom, sideTo]) => {
    const [tx, tz] = directionXZ(deg + 90);
    const shift = (sideFrom + sideTo) / 2;
    return orientedBox(`plataforma-${deg}`, [DECK_CENTER[0] + shift * tx, DECK_Y - 0.15, DECK_CENTER[1] + shift * tz], [apothem, 0.15, (sideTo - sideFrom) / 2], deg);
  }),
  CORNER_FILL,
];

// Deck railing corners; the face toward the stairs leaves the landing open.
const RAILING: Point2[] = [[-33.76, -133.87], [-37.58, -132.41], [-40.63, -133.76], [-42.02, -137.4], [-40.66, -140.45], [-36.84, -141.91], [-33.79, -140.56], [-32.4, -136.92]];
const LANDING_GAP: [Point2, Point2] = [[-34.89, -133.44], [-36.57, -132.79]];
const RAILING_TOP = DECK_Y + 1.1;

// Point `distance` meters from `from` toward `to`.
const toward = (from: Point2, to: Point2, distance: number): Point2 => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return [from[0] + ((to[0] - from[0]) * distance) / length, from[1] + ((to[1] - from[1]) * distance) / length];
};

function railingBoxes(): ColliderBox[] {
  const boxes = RAILING.map((corner, i) => [RAILING[(i + RAILING.length - 1) % RAILING.length], corner] as const)
    .filter(([a]) => a !== RAILING[0])
    .map(([a, b], i) => wallBox(`baranda-${i}`, a, b, DECK_Y, RAILING_TOP, 0.06));
  // The two railings meeting at the stair corner (RAILING[0]) stop short of it, like the deck bands: the gap left is
  // narrower than the avatar.
  boxes[0] = wallBox('baranda-0', RAILING[RAILING.length - 1], toward(RAILING[0], RAILING[RAILING.length - 1], STAIR_CORNER_TRIM.band24), DECK_Y, RAILING_TOP, 0.06);
  boxes.push(wallBox('baranda-escalera-a', toward(RAILING[0], LANDING_GAP[0], STAIR_CORNER_TRIM.band69), LANDING_GAP[0], DECK_Y, RAILING_TOP, 0.06));
  boxes.push(wallBox('baranda-escalera-b', LANDING_GAP[1], RAILING[1], DECK_Y, RAILING_TOP, 0.06));
  return boxes;
}

// House: square timber walls (faces at 69/159/249/339°, door on the 69° face) around a round room (r 2.79). Each
// wall box fills from the round room out to the timber face; four diagonal boxes close the corners behind the round
// wall, so the inside reads as an octagon with apothem 2.62. Over the doorway a lintel, and the ceiling (ElfoCielo)
// closes the room: walls, lintel and ceiling also keep the camera inside, like in Imeri's house.
const ROOM_CENTER: Point2 = [-37.247, -137.316];
const ROOM_APOTHEM = 2.62;
const HOUSE_FACES: Record<number, number> = { 69: 3.119, 159: 3.286, 249: 3.318, 339: 3.391 };
const DOOR_GAP: [number, number] = [-0.666, 0.574]; // along the front face, measured from the room center
const DOOR_TOP = DECK_Y + 2.06; // the leaf is 2.05 m tall
const WALL_TOP = DECK_Y + 3;
const CEILING_BOTTOM = 24.4;

// Point at `depth` from the room center along the face normal `normalDeg`, shifted `along` the face.
const onFace = (normalDeg: number, depth: number, along: number): Point2 => {
  const [nx, nz] = directionXZ(normalDeg);
  const [tx, tz] = directionXZ(normalDeg + 90);
  return [ROOM_CENTER[0] + depth * nx + along * tx, ROOM_CENTER[1] + depth * nz + along * tz];
};

function houseBoxes(): ColliderBox[] {
  const boxes: ColliderBox[] = [];
  for (const [deg, apothem] of Object.entries(HOUSE_FACES).map(([d, a]) => [Number(d), a] as const)) {
    const depth = (ROOM_APOTHEM + apothem) / 2;
    const half = (apothem - ROOM_APOTHEM) / 2;
    const from = -HOUSE_FACES[(deg + 270) % 360];
    const to = HOUSE_FACES[(deg + 90) % 360];
    const spans: [number, number][] = deg === 69 ? [[from, DOOR_GAP[0]], [DOOR_GAP[1], to]] : [[from, to]];
    spans.forEach(([s0, s1], i) => boxes.push(wallBox(`pared-${deg}-${i}`, onFace(deg, depth, s0), onFace(deg, depth, s1), DECK_Y, WALL_TOP, half)));
    if (deg === 69) boxes.push(wallBox('dintel', onFace(deg, depth, DOOR_GAP[0]), onFace(deg, depth, DOOR_GAP[1]), DOOR_TOP, WALL_TOP, half));
  }
  for (const deg of [24, 114, 204, 294]) boxes.push(wallBox(`pared-esquina-${deg}`, onFace(deg, 2.935, -1.185), onFace(deg, 2.935, 1.185), DECK_Y, WALL_TOP, 0.315));
  // Ceiling slab over the whole square house, aligned with its faces.
  boxes.push(orientedBox('cielo', [ROOM_CENTER[0], CEILING_BOTTOM + 0.15, ROOM_CENTER[1]], [3.3, 0.15, 3.3], 69));
  return boxes;
}

const HOUSE_BOXES = houseBoxes();

// Furniture the avatar can walk into: table, bookcase and the potion shelf.
const FURNITURE: ColliderBox[] = [
  orientedBox('mesa', [-37.383, 21.947, -137.704], [0.637, 0.251, 0.636], 69),
  orientedBox('biblioteca', [-36.013, 22.758, -139.242], [0.67, 1.06, 0.334], 32.5),
  orientedBox('frascos', [-34.933, 22.868, -137.732], [0.999, 1.17, 0.196], 80),
];

// Giant tree: trunk from the ground up to the deck, plus the wide base where the roots spread.
const TRUNK: ColliderBox[] = [
  orientedBox('tronco-a', [-37.55, 15.7, -138], [2.6, 5.7, 2.6], 0),
  orientedBox('tronco-b', [-37.55, 15.7, -138], [2.6, 5.7, 2.6], 45),
  orientedBox('raices-a', [-37.13, 10.35, -138.16], [4, 0.95, 4], 0),
  orientedBox('raices-b', [-37.13, 10.35, -138.16], [4, 0.95, 4], 45),
];

export const ELFO_COLLIDER_BOXES: ColliderBox[] = [...stairBoxes(), ...DECK_BOXES, ...railingBoxes(), ...HOUSE_BOXES, ...FURNITURE, ...TRUNK];

// What the third-person camera collides with: the house shell (walls, lintel, ceiling). Furniture is left out, it would
// make the camera zoom in abruptly.
export const ELFO_CAMERA_BOXES: ColliderBox[] = HOUSE_BOXES;
