// The goblins of the Dark Forest wait in packs along the way through it, from the valley pass to the hidden wall. A
// pack attacks together when the player comes near any of its goblins, so each stretch of the forest has its ambush
// (and the first one is right at the way in).

// Where each goblin waits (world x, z): two per pack.
export const HOMES: readonly (readonly [number, number])[] = [
  // At the way in from the valley.
  [-34, -198],
  [-24, -202],
  // In the heart of the forest.
  [-12, -222],
  [-2, -226],
  // Before the hidden wall.
  [18, -200],
  [26, -206],
];

const PACK_SIZE = 2;
// A pack wakes when the player is this close to one of its goblins' spots (m).
const WAKE_DISTANCE = 22;

export const packOf = (index: number) => Math.floor(index / PACK_SIZE);

const awake = new Set<number>();

// Whether the pack of goblin `index` is after the player: once it has seen them, until `calmPacks`.
export function packAwake(index: number, playerX: number, playerZ: number): boolean {
  const pack = packOf(index);
  if (awake.has(pack)) return true;
  const [x, z] = HOMES[index];
  if (Math.hypot(playerX - x, playerZ - z) > WAKE_DISTANCE) return false;
  awake.add(pack);
  return true;
}

// The player left the forest or fell: every pack goes back to wait.
export function calmPacks() {
  awake.clear();
}
