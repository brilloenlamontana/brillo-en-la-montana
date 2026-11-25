// The goblins of the Dark Forest wait in packs along the way through it, from the valley pass to the hidden wall. A
// pack attacks together when the player comes near any of its goblins, so each stretch of the forest has its ambush
// (and the first one is right at the way in). A pack that has seen the player follows them wherever they run, out of
// the forest too, as far as the valley and Hedrig's town; it only gives up when the player falls, gets farther than
// that or goes into a house.

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

// Whether the pack of goblin `index` is after the player: once it has seen them, until `calmPacks`. `canWake`: a pack
// that is still waiting only notices a player who is in the forest.
export function packAwake(index: number, playerX: number, playerZ: number, canWake = true): boolean {
  const pack = packOf(index);
  if (awake.has(pack)) return true;
  if (!canWake) return false;
  const [x, z] = HOMES[index];
  if (Math.hypot(playerX - x, playerZ - z) > WAKE_DISTANCE) return false;
  awake.add(pack);
  return true;
}

// The player fell or got too far away: every pack goes back to wait.
export function calmPacks() {
  awake.clear();
}
