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

function stairBoxes(): ColliderBox[] {
  const boxes: ColliderBox[] = [];
  for (let i = 0; i < STAIR_PATH.length - 1; i++) {
    const a = STAIR_PATH[i];
    const b = STAIR_PATH[i + 1];
    boxes.push(segmentBox(`escalera-${i}`, a, b, STAIR_HALF_WIDTH, 0.1, -0.1, 0.12));
    // Railings on both sides, so the avatar cannot fall off toward the trunk or outward.
    const [nx, nz] = (() => {
      const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz);
      return [-dz / length, dx / length];
    })();
    for (const side of [-1, 1]) {
      const offset = (p: Point3): Point3 => [p[0] + side * RAIL_OFFSET * nx, p[1], p[2] + side * RAIL_OFFSET * nz];
      boxes.push(segmentBox(`escalera-${i}-baranda${side}`, offset(a), offset(b), 0.05, RAIL_HALF_HEIGHT, RAIL_HALF_HEIGHT, 0.15));
    }
  }
  return boxes;
}

// Octagonal deck (irregular: each pair of opposite faces has its own apothem). Two crossed squares would make an
// eight-pointed star, so it is the union of four bands instead: each spans one pair of opposite faces and is as wide
// as those faces' sides.
const DECK_CENTER: Point2 = [-37.21, -137.16];
const DECK_BANDS: [faceDeg: number, apothem: number, halfSide: number][] = [[24, 4.57, 1.674], [69, 4.415, 2.047], [114, 4.57, 1.674], [159, 4.515, 1.947]];
const DECK_BOXES: ColliderBox[] = DECK_BANDS.map(([deg, apothem, halfSide]) =>
  orientedBox(`plataforma-${deg}`, [DECK_CENTER[0], DECK_Y - 0.15, DECK_CENTER[1]], [apothem, 0.15, halfSide], deg),
);

// Deck railing corners; the face toward the stairs leaves the landing open.
const RAILING: Point2[] = [[-33.76, -133.87], [-37.58, -132.41], [-40.63, -133.76], [-42.02, -137.4], [-40.66, -140.45], [-36.84, -141.91], [-33.79, -140.56], [-32.4, -136.92]];
const LANDING_GAP: [Point2, Point2] = [[-34.89, -133.44], [-36.57, -132.79]];
const RAILING_TOP = DECK_Y + 1.1;

function railingBoxes(): ColliderBox[] {
  const boxes = RAILING.map((corner, i) => [RAILING[(i + RAILING.length - 1) % RAILING.length], corner] as const)
    .filter(([a]) => a !== RAILING[0])
    .map(([a, b], i) => wallBox(`baranda-${i}`, a, b, DECK_Y, RAILING_TOP, 0.06));
  boxes.push(wallBox('baranda-escalera-a', RAILING[0], LANDING_GAP[0], DECK_Y, RAILING_TOP, 0.06));
  boxes.push(wallBox('baranda-escalera-b', LANDING_GAP[1], RAILING[1], DECK_Y, RAILING_TOP, 0.06));
  return boxes;
}

// House: square timber walls (faces at 69/159/249/339°, door on the 69° face) around a round room (r 2.79). Each
// wall box fills from the round room out to the timber face; four diagonal boxes close the corners behind the round
// wall, so the inside reads as an octagon with apothem 2.62.
const ROOM_CENTER: Point2 = [-37.247, -137.316];
const ROOM_APOTHEM = 2.62;
const HOUSE_FACES: Record<number, number> = { 69: 3.119, 159: 3.286, 249: 3.318, 339: 3.391 };
const DOOR_GAP: [number, number] = [-0.666, 0.574]; // along the front face, measured from the room center
const WALL_TOP = DECK_Y + 3;

function houseBoxes(): ColliderBox[] {
  const at = (normalDeg: number, depth: number, along: number): Point2 => {
    const [nx, nz] = directionXZ(normalDeg);
    const [tx, tz] = directionXZ(normalDeg + 90);
    return [ROOM_CENTER[0] + depth * nx + along * tx, ROOM_CENTER[1] + depth * nz + along * tz];
  };
  const boxes: ColliderBox[] = [];
  for (const [deg, apothem] of Object.entries(HOUSE_FACES).map(([d, a]) => [Number(d), a] as const)) {
    const depth = (ROOM_APOTHEM + apothem) / 2;
    const half = (apothem - ROOM_APOTHEM) / 2;
    const from = -HOUSE_FACES[(deg + 270) % 360];
    const to = HOUSE_FACES[(deg + 90) % 360];
    const spans: [number, number][] = deg === 69 ? [[from, DOOR_GAP[0]], [DOOR_GAP[1], to]] : [[from, to]];
    spans.forEach(([s0, s1], i) => boxes.push(wallBox(`pared-${deg}-${i}`, at(deg, depth, s0), at(deg, depth, s1), DECK_Y, WALL_TOP, half)));
  }
  for (const deg of [24, 114, 204, 294]) boxes.push(wallBox(`pared-esquina-${deg}`, at(deg, 2.935, -1.185), at(deg, 2.935, 1.185), DECK_Y, WALL_TOP, 0.315));
  return boxes;
}

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

export const ELFO_COLLIDER_BOXES: ColliderBox[] = [...stairBoxes(), ...DECK_BOXES, ...railingBoxes(), ...houseBoxes(), ...FURNITURE, ...TRUNK];
