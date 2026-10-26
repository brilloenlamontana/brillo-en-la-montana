import { visibleFrom } from '@/game/world/visibility';

// Where each part of the closing story is drawn. The summit is the highest point: seen from wherever the fog allows.
export const VISIBLE_FROM = {
  cumbre: visibleFrom(['pantano', 'valle', 'bosque', 'pueblo', 'cumbre'], ['santuario']),
  santuarioInterior: visibleFrom(['cumbre'], ['santuario']),
} as const;

export const CAMERA_BLOCKS_IN = {
  santuario: visibleFrom(['cumbre'], ['santuario']),
} as const;
