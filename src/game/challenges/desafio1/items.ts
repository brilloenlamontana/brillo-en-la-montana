import type { Collectible } from '@/game/engine/interaction/Collectibles';
import { DESAFIO1_MODELS } from './assets';

const DIR = DESAFIO1_MODELS.casaDeImeri.recogibles;

// Items lying in Imeri's house (pickable once she offered her help).
export const IMERI_COLLECTIBLES = [
  { id: 'gema', name: 'Gema', url: `${DIR}/Gema.glb` },
  { id: 'soga', name: 'Soga', url: `${DIR}/Soga.glb` },
  { id: 'pocionAmbar', name: 'Poción ámbar', url: `${DIR}/PocionAmbar.glb` },
  { id: 'pocionHojas', name: 'Poción de hojas', url: `${DIR}/PocionHojas.glb` },
  { id: 'pocionHongos', name: 'Poción de hongos', url: `${DIR}/PocionHongos.glb` },
  { id: 'pocionPequena', name: 'Poción pequeña', url: `${DIR}/PocionPequena.glb` },
  { id: 'pocionRoja', name: 'Poción roja', url: `${DIR}/PocionRoja.glb` },
] as const satisfies readonly Collectible[];

type ImeriItemId = (typeof IMERI_COLLECTIBLES)[number]['id'];

// The five potions are mixed into the insecticide: they never take a backpack slot themselves.
export const POTION_IDS: readonly ImeriItemId[] = ['pocionAmbar', 'pocionHojas', 'pocionHongos', 'pocionPequena', 'pocionRoja'];

// Backpack slots of Challenge 1, in order.
export type BackpackItemId = 'gema' | 'soga' | 'insecticida';

// The gem switches off the golem within this distance (m); the insecticide reaches zumbadores within this radius.
export const GEMA_RANGE = 15;
export const SPRAY_RANGE = 10;
