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

// A sword swing reaches the goblins within this distance (m) of the player.
export const SWORD_RANGE = 2.8;

// Looking through the lens shows the true color of the fruit within this distance (m) of the player.
export const LENS_RANGE = 15;

// A fruit on the ground can be eaten from this horizontal distance (m) to its edge.
export const EAT_RANGE = 1.2;
