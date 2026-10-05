const RECOGIBLES_DIR = '/models-3d/map/CasaImeri/Recogibles/';

// Objetos que el jugador recoge en la casa de Imeri.
export const RECOGIBLES = [
  { id: 'gema', name: 'Gema', url: `${RECOGIBLES_DIR}Gema.glb` },
  { id: 'soga', name: 'Soga', url: `${RECOGIBLES_DIR}Soga.glb` },
  { id: 'pocionAmbar', name: 'Poción ámbar', url: `${RECOGIBLES_DIR}PocionAmbar.glb` },
  { id: 'pocionHojas', name: 'Poción de hojas', url: `${RECOGIBLES_DIR}PocionHojas.glb` },
  { id: 'pocionHongos', name: 'Poción de hongos', url: `${RECOGIBLES_DIR}PocionHongos.glb` },
  { id: 'pocionPequena', name: 'Poción pequeña', url: `${RECOGIBLES_DIR}PocionPequeña.glb` },
  { id: 'pocionRoja', name: 'Poción roja', url: `${RECOGIBLES_DIR}PocionRoja.glb` },
] as const;

export type RecogibleId = (typeof RECOGIBLES)[number]['id'];

export const RECOGIBLE_URLS = RECOGIBLES.map((item) => item.url);

// Con las 5 pociones se prepara el insecticida; si falta una, no se puede hacer.
export const POCION_IDS: readonly RecogibleId[] = ['pocionAmbar', 'pocionHojas', 'pocionHongos', 'pocionPequena', 'pocionRoja'];

// Lo que guarda la mochila, en el orden de sus espacios. Las pociones no ocupan espacio: se convierten en insecticida.
export const MOCHILA_ITEMS = [
  { id: 'gema', name: 'Gema', url: `${RECOGIBLES_DIR}Gema.glb` },
  { id: 'soga', name: 'Soga', url: `${RECOGIBLES_DIR}Soga.glb` },
  { id: 'insecticida', name: 'Insecticida', url: `${RECOGIBLES_DIR}Insecticida.glb` },
] as const;

export type MochilaItemId = (typeof MOCHILA_ITEMS)[number]['id'];

export function countPociones(collected: readonly string[]): number {
  return POCION_IDS.filter((id) => collected.includes(id)).length;
}

export function hasMochilaItem(id: MochilaItemId, collected: readonly string[]): boolean {
  return id === 'insecticida' ? countPociones(collected) === POCION_IDS.length : collected.includes(id);
}
