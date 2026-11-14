import type { GameProgress } from '@/store/progressStore';
import type { Region } from './regions';

// The whole world seen from above, as the minimap draws it (public/sprites-2d/minimapa.jpg, rendered from Map.blend
// with the top of the picture to the north, game -z): the stretch of the map the picture covers, in metres.
export const MAP_PICTURE = { url: '/sprites-2d/minimapa.jpg', x: [-152, 174], z: [-268, 88] } as const;

// Where a point of the world falls on that picture, as fractions (0..1) from its left and from its top.
export const onMapPicture = (x: number, z: number) => ({
  left: (x - MAP_PICTURE.x[0]) / (MAP_PICTURE.x[1] - MAP_PICTURE.x[0]),
  top: (z - MAP_PICTURE.z[0]) / (MAP_PICTURE.z[1] - MAP_PICTURE.z[0]),
});

// What a place is: somewhere people live or help (a house), a stretch of the journey (a challenge) or the end of the
// road. The two bonuses are not on the map: they are optional extras the player comes across (or not) by themselves.
export type LandmarkKind = 'casa' | 'desafio' | 'meta';
export type Landmark = { id: string; name: string; kind: LandmarkKind; x: number; z: number };

// The places that matter along the story, in its order.
export const LANDMARKS: readonly Landmark[] = [
  { id: 'villa', name: 'Villa de Boj', kind: 'casa', x: -80, z: 18 },
  { id: 'imeri', name: 'Casa de Imeri', kind: 'casa', x: 16, z: 44 },
  { id: 'pantano', name: 'Pantano de la Tristeza', kind: 'desafio', x: 62, z: -8 },
  { id: 'elfo', name: 'Árbol del elfo', kind: 'casa', x: -37, z: -126 },
  { id: 'bosque', name: 'Bosque de la Oscuridad', kind: 'desafio', x: -24, z: -214 },
  { id: 'hedrig', name: 'Pueblo de Hedrig', kind: 'casa', x: 86, z: -210 },
  { id: 'mina', name: 'Túneles de la Cumbre', kind: 'desafio', x: 99, z: -194 },
  { id: 'santuario', name: 'Santuario del cáliz', kind: 'meta', x: 156, z: -153 },
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
