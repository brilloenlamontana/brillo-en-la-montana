import {
  BOSQUE_REGION_MAX_X,
  BOSQUE_REGION_MAX_Z,
  CASA_IMERI_ZONE,
  COLINA_REGION,
  PANTANO_POLYGON,
  PANTANO_REGION_MARGIN,
  VILLA_BOJ_ZONE,
  type Zone,
} from '../constants/zones';
import { distanceToPolygonEdge, isPointInPolygon } from './polygon';

// Zona del mapa donde está el jugador; decide qué se dibuja (ver constants/regionVisibility.ts).
export type Region = 'villa' | 'camino' | 'casa' | 'pantano' | 'bosque' | 'colina';

const inZone = ({ center, enterRadius, exitRadius }: Zone, x: number, z: number, wasInside: boolean) =>
  Math.hypot(x - center[0], z - center[1]) < (wasInside ? exitRadius : enterRadius);

// `previous` da histéresis: para salir de una región hay que alejarse un poco más de lo que costó entrar.
export function classifyRegion(x: number, z: number, previous: Region): Region {
  if (inZone(VILLA_BOJ_ZONE, x, z, previous === 'villa')) return 'villa';
  if (inZone(CASA_IMERI_ZONE, x, z, previous === 'casa')) return 'casa';
  if (x < BOSQUE_REGION_MAX_X && z < (previous === 'bosque' ? BOSQUE_REGION_MAX_Z.exit : BOSQUE_REGION_MAX_Z.enter)) return 'bosque';
  if (x > COLINA_REGION.minX && z < COLINA_REGION.maxZ) return 'colina';
  const margin = previous === 'pantano' ? PANTANO_REGION_MARGIN.exit : PANTANO_REGION_MARGIN.enter;
  if (isPointInPolygon(x, z, PANTANO_POLYGON) || distanceToPolygonEdge(x, z, PANTANO_POLYGON) < margin) return 'pantano';
  return 'camino';
}
