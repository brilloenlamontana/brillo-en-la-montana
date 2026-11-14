import { visibleFrom } from '@/game/world/visibility';

// Where each part of Challenge 1 is drawn (or exists). Anything not listed for a region costs nothing there.
export const VISIBLE_FROM = {
  // From the swamp on, the village is behind the mountains.
  villaBoj: visibleFrom(['villa', 'camino', 'casa'], ['imeri']),
  cartaAlcalde: visibleFrom(['villa', 'camino', 'casa']),
  // Once at Imeri's house the villager woman is no longer drawn.
  aldeana: visibleFrom(['villa', 'camino']),
  casaExterior: visibleFrom(['villa', 'camino', 'casa', 'pantano'], ['imeri']),
  // In the swamp nothing of the village (villager woman included) nor of the inside of Imeri's house is drawn.
  casaInterior: visibleFrom(['casa'], ['imeri']),
  imeri: visibleFrom(['camino', 'casa'], ['imeri']),
  // The golem and the zumbadores only exist near the swamp.
  enemigos: visibleFrom(['pantano', 'valle']),
  // The inside of the wells only shows from the swamp; the lids cover the holes in the ground from farther away.
  pozos: visibleFrom(['pantano']),
  tapas: visibleFrom(['camino', 'casa', 'pantano', 'valle']),
  // The reeds and dry branches of the mud show from the shores around the swamp too.
  vegetacion: visibleFrom(['camino', 'casa', 'pantano', 'valle']),
  // Bonus 1: the ruined hut of the statue, where the swamp ends and the valley begins.
  choza: visibleFrom(['pantano', 'valle']),
} as const;

// Where the third-person camera collides with Challenge 1 geometry: only the meshes around the player are tested.
export const CAMERA_BLOCKS_IN = {
  casaImeri: visibleFrom(['casa'], ['imeri']),
  pozos: visibleFrom(['pantano']),
} as const;
