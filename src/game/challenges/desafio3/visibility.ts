import { visibleFrom } from '@/game/world/visibility';

// Where each part of Challenge 3 is drawn (or exists).
export const VISIBLE_FROM = {
  puebloHedrig: visibleFrom(['bosque', 'pueblo', 'tuneles'], ['hedrig']),
  casaHedrigInterior: visibleFrom(['pueblo'], ['hedrig']),
  // Inside the mountain nothing outside shows except at the openings.
  tuneles: visibleFrom(['pueblo', 'tuneles', 'cumbre']),
  tunelesObjetos: visibleFrom(['tuneles']),
} as const;

// Where the third-person camera collides with Challenge 3 geometry. The tunnel galleries are a heavy mesh: tested only
// from inside them.
export const CAMERA_BLOCKS_IN = {
  casaHedrig: visibleFrom(['pueblo'], ['hedrig']),
  tuneles: visibleFrom(['tuneles']),
} as const;
