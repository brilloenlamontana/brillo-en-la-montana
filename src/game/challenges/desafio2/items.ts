import type { Collectible } from '@/game/engine/interaction/Collectibles';
import { DESAFIO2_MODELS } from './assets';

const DIR = DESAFIO2_MODELS.casaDelElfo.recogibles;

// The elf's tools, in his house (pickable once he offered his help). Each answers one danger of the forest: the
// sword the goblins, the lens the poisonous fruit trees and the map the shifting paths.
export const ELFO_COLLECTIBLES = [
  { id: 'espada', name: 'Espada élfica', url: `${DIR}/Espada.glb` },
  { id: 'lente', name: 'Lente revelador', url: `${DIR}/Lente.glb` },
  { id: 'mapa', name: 'Mapa del bosque', url: `${DIR}/Mapa.glb` },
] as const satisfies readonly Collectible[];

export type ElfoItemId = (typeof ELFO_COLLECTIBLES)[number]['id'];
