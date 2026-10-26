import type { Collectible } from '@/game/engine/interaction/Collectibles';
import { DESAFIO3_MODELS } from './assets';

const DIR = DESAFIO3_MODELS.casaDeHedrig.recogibles;

// Items in the house of Hedrig, the dwarf miner.
export const HEDRIG_COLLECTIBLES = [
  { id: 'guante', name: 'Guante de minero', url: `${DIR}/Guante.glb` },
  { id: 'brujula', name: 'Brújula', url: `${DIR}/Brujula.glb` },
  { id: 'muneca', name: 'Muñeca de trapo', url: `${DIR}/Muneca.glb` },
] as const satisfies readonly Collectible[];
