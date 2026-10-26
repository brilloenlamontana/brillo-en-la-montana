import type { Interior, Region } from '@/game/world/regions';
import { visibleFrom } from '@/game/world/visibility';

// Where each part of Challenge 2 is drawn (or exists).
export const VISIBLE_FROM = {
  casaElfoExterior: visibleFrom(['pantano', 'valle', 'bosque'], ['elfo']),
  casaElfoInterior: visibleFrom(['valle'], ['elfo']),
  elfo: visibleFrom(['pantano', 'valle']),
} as const;

// Where the third-person camera collides with Challenge 2 geometry: the elf's house from its valley and from inside.
export const CAMERA_BLOCKS_IN = {
  casaElfo: visibleFrom(['valle'], ['elfo']),
} as const;

type BosquePart = 'arboles' | 'hongos' | 'manzanas';

// Farthest distance from the camera (m) each part of the Dark Forest is drawn at, per region; unlisted = not drawn.
// Only the trees reach the swamp and the valley.
export const BOSQUE_MAX_DISTANCE: Record<BosquePart, Partial<Record<Region, number>>> = {
  arboles: { pantano: 160, valle: 160, bosque: 100, pueblo: 120, cumbre: 200 },
  hongos: { valle: 30, bosque: 60, pueblo: 40 },
  manzanas: { valle: 25, bosque: 50, pueblo: 30 },
};

// From inside the elf's house only the trees near its windows.
export const BOSQUE_MAX_DISTANCE_INDOORS: Record<BosquePart, Partial<Record<Interior, number>>> = {
  arboles: { elfo: 60 },
  hongos: {},
  manzanas: {},
};
