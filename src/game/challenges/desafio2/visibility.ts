import { visibleFrom } from '@/game/world/visibility';

// Where each part of Challenge 2 is drawn (or exists).
export const VISIBLE_FROM = {
  casaElfoExterior: visibleFrom(['pantano', 'valle', 'bosque'], ['elfo']),
  casaElfoInterior: visibleFrom(['valle'], ['elfo']),
  elfo: visibleFrom(['pantano', 'valle']),
  // The goblins only exist in the forest and its valley; far away they are unmounted.
  duendes: visibleFrom(['valle', 'bosque']),
  muroOculto: visibleFrom(['valle', 'bosque', 'pueblo']),
  // The trail the map reveals runs from the forest entrance to past the wall, at the edge of Hedrig's town.
  sendero: visibleFrom(['valle', 'bosque', 'pueblo']),
  // Bonus 2: the fairy's clearing and its distant light, seen from the forest and from its exit toward the town.
  claro: visibleFrom(['bosque', 'pueblo']),
} as const;

// Where the third-person camera collides with Challenge 2 geometry: the elf's house from its valley and from inside.
export const CAMERA_BLOCKS_IN = {
  casaElfo: visibleFrom(['valle'], ['elfo']),
} as const;

// How far from the camera (m) each part of the forest is drawn, the same from anywhere on the map.
export const BOSQUE_REACH = { arboles: 200, hongos: 60, manzanas: 50 } as const;
