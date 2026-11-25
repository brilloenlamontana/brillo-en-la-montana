import type { GameProgress } from '@/store/progressStore';
import { BOSQUE_POLYGON, CASA_IMERI_ZONE, CUMBRE_REGION, PANTANO_POLYGON, PANTANO_REGION_MARGIN, PUEBLO_HEDRIG_ZONE, VALLE_POLYGON, VILLA_BOJ_ZONE } from './geography';
import type { Region } from './regions';

// The whole world seen from above, as the minimap draws it (public/sprites-2d/minimapa.webp, 2608 x 2848 px, 8 px per
// metre, so the whole map can be zoomed; rendered from Map.blend with scripts/minimapa, with the top of the picture to
// the north, game -z): the stretch of the map the picture covers, in metres.
export const MAP_PICTURE = { url: '/sprites-2d/minimapa.webp', x: [-152, 174], z: [-268, 88] } as const;

// Where a point of the world falls on that picture, as fractions (0..1) from its left and from its top.
export const onMapPicture = (x: number, z: number) => ({
  left: (x - MAP_PICTURE.x[0]) / (MAP_PICTURE.x[1] - MAP_PICTURE.x[0]),
  top: (z - MAP_PICTURE.z[0]) / (MAP_PICTURE.z[1] - MAP_PICTURE.z[0]),
});

// What a place is: somewhere people live or help (a house), a stretch of the journey (a challenge) or the end of the
// road. The two bonuses are not on the map: they are optional extras the player comes across (or not) by themselves.
export type LandmarkKind = 'casa' | 'desafio' | 'meta';
// `stage` is the step of the story (see mapStage) from which the place is drawn on the map.
export type Landmark = { id: string; name: string; kind: LandmarkKind; x: number; z: number; stage: number };

// The places that matter along the story, in its order. A challenge is marked at its way in (the same spot as its
// beacon of light: see the `objective` of each challenge), not in its middle.
export const LANDMARKS: readonly Landmark[] = [
  { id: 'villa', name: 'Villa de Boj', kind: 'casa', x: -80, z: 18, stage: 0 },
  { id: 'imeri', name: 'Casa de Imeri', kind: 'casa', x: 16, z: 44, stage: 1 },
  { id: 'pantano', name: 'Pantano de la Tristeza', kind: 'desafio', x: 60, z: 8, stage: 2 },
  { id: 'elfo', name: 'Árbol del elfo', kind: 'casa', x: -37, z: -126, stage: 3 },
  { id: 'bosque', name: 'Bosque de la Oscuridad', kind: 'desafio', x: -25, z: -182, stage: 4 },
  { id: 'hedrig', name: 'Pueblo de Hedrig', kind: 'casa', x: 86, z: -210, stage: 5 },
  { id: 'mina', name: 'Túneles de la Cumbre', kind: 'desafio', x: 99, z: -194, stage: 6 },
  { id: 'santuario', name: 'Santuario del cáliz', kind: 'meta', x: 156, z: -153, stage: 7 },
];

// What each part of the map is called.
export const REGION_NAMES: Record<Region, string> = {
  villa: 'Villa de Boj',
  camino: 'Camino del valle',
  casa: 'Casa de Imeri',
  pantano: 'Pantano de la Tristeza',
  valle: 'Valle del árbol gigante',
  bosque: 'Bosque de la Oscuridad',
  pueblo: 'Pueblo de Hedrig',
  tuneles: 'Túneles de la Cumbre',
  cumbre: 'Cumbre de la Desolación',
};

// How far the story has gone, as a step: the map starts dark and each step uncovers the part the story sends the
// player to next, so the map never tells what lies ahead.
//   0 the village · 1 the road and Imeri's house (the villager's help) · 2 the swamp (Imeri's help) · 3 the valley of
//   the giant tree (swamp crossed) · 4 the Dark Forest (the elf's help) · 5 Hedrig's town (forest crossed) · 6 the mine
//   (Hedrig's help) · 7 the summit (tunnels crossed).
export const MAP_STAGES = 8;
export function mapStage(progress: Partial<GameProgress> | undefined): number {
  if (!progress) return 0;
  if (progress.juegoCompletado) return MAP_STAGES;
  if (progress.mision3Completada) return 7;
  if (progress.mision2Completada) return progress.hedrigHelp === 'accepted' ? 6 : 5;
  if (progress.mision1Completada) return progress.elfoHelp === 'accepted' ? 4 : 3;
  if (progress.aldeanoHelp !== 'accepted') return 0;
  return progress.imeriHelp === 'accepted' ? 2 : 1;
}

// A stretch of the map a step uncovers (world x, z; metres): a circle, a road between two points or an outline, the
// last two widened by `margin` on every side.
export type MapArea =
  | { shape: 'circle'; x: number; z: number; rx: number; rz: number }
  | { shape: 'road'; from: readonly [number, number]; to: readonly [number, number]; margin: number }
  | { shape: 'outline'; points: readonly (readonly [number, number])[]; margin: number };

// What each step uncovers (the mine is under the town: its step only adds its mark).
const STAGE_AREAS: readonly (readonly MapArea[])[] = [
  [{ shape: 'circle', x: VILLA_BOJ_ZONE.center[0], z: VILLA_BOJ_ZONE.center[1], rx: 40, rz: 40 }],
  [
    { shape: 'road', from: VILLA_BOJ_ZONE.center, to: CASA_IMERI_ZONE.center, margin: 24 },
    { shape: 'circle', x: CASA_IMERI_ZONE.center[0], z: CASA_IMERI_ZONE.center[1], rx: 32, rz: 32 },
  ],
  [{ shape: 'outline', points: PANTANO_POLYGON, margin: PANTANO_REGION_MARGIN.enter }],
  [{ shape: 'outline', points: VALLE_POLYGON, margin: 8 }],
  [{ shape: 'outline', points: BOSQUE_POLYGON, margin: 6 }],
  [{ shape: 'circle', x: PUEBLO_HEDRIG_ZONE.center[0], z: PUEBLO_HEDRIG_ZONE.center[1], rx: 36, rz: 36 }],
  [],
  [{ shape: 'circle', x: CUMBRE_REGION.center[0], z: CUMBRE_REGION.center[1], rx: CUMBRE_REGION.radiusX + 6, rz: CUMBRE_REGION.radiusZ + 6 }],
];

// Every stretch of the map uncovered at a step of the story.
export const uncoveredAreas = (stage: number): MapArea[] => STAGE_AREAS.slice(0, stage + 1).flat();

// Where the story sends the player next (the id of a landmark), or null once the chalice is back.
export function nextLandmark(progress: Partial<GameProgress> | undefined): string | null {
  if (!progress || progress.juegoCompletado) return null;
  if (!progress.mision1Completada) {
    if (progress.aldeanoHelp !== 'accepted') return 'villa';
    return progress.imeriHelp === 'accepted' ? 'pantano' : 'imeri';
  }
  if (!progress.mision2Completada) return progress.elfoHelp === 'accepted' ? 'bosque' : 'elfo';
  if (!progress.mision3Completada) return progress.hedrigHelp === 'accepted' ? 'mina' : 'hedrig';
  return 'santuario';
}
