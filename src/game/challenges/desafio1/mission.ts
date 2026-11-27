import { listed, type Hint, type ItemState, type MissionStep, type Objective } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';
import { POTION_IDS, type BackpackItemId } from './items';

// Rules of Challenge 1, as pure functions of the saved progress (no React, no three.js): the game and the admin
// dashboard read the same truth.

// Zumbadores hidden in the swamp wells.
export const ZUMBADOR_COUNT = 10;

type Progress = Partial<GameProgress> | undefined;

const collected = (progress: Progress) => progress?.collectedItems ?? [];
const defeatedZumbadores = (progress: Progress) => new Set(progress?.zumbadoresDefeated ?? []).size;

export const countPociones = (progress: Progress) => POTION_IDS.filter((id) => collected(progress).includes(id)).length;
export const allZumbadoresDefeated = (progress: Progress) => defeatedZumbadores(progress) >= ZUMBADOR_COUNT;

// Imeri's door only opens after accepting the villager's help (she waits at home) and then hers.
export const isHouseUnlocked = (progress: Progress) => progress?.aldeanoHelp === 'accepted' && progress?.imeriHelp === 'accepted';
export const isBackpackActive = (progress: Progress) => progress?.imeriHelp === 'accepted';

// With the golem and every zumbador defeated the wells swallow no one anymore (and the rope is no longer needed).
export const areWellsSafe = (progress: Progress) => progress?.golemDefeated === true && allZumbadoresDefeated(progress);

// Challenge 1 is done once the swamp is safe. The saved flag (mision1Completada, with its date) records that moment;
// the rule also counts on its own, so a save that has the swamp cleared but lacks the flag never blocks the story
// (StoryFlags writes the missing flag back).
export const isDesafio1Completado = (progress: Progress) => progress?.mision1Completada === true || areWellsSafe(progress);

// Each item leaves the backpack once it fulfilled its purpose: the gem when the golem goes off, the insecticide (the
// five potions) with the last zumbador, and the rope when no enemy is left.
export function getItemState(id: BackpackItemId, progress: Progress): ItemState {
  const items = collected(progress);
  if (id === 'gema') return progress?.golemDefeated ? 'spent' : items.includes('gema') ? 'owned' : 'missing';
  if (id === 'soga') return areWellsSafe(progress) ? 'spent' : items.includes('soga') ? 'owned' : 'missing';
  if (allZumbadoresDefeated(progress)) return 'spent';
  return countPociones(progress) === POTION_IDS.length ? 'owned' : 'missing';
}

export const hasItem = (id: BackpackItemId, progress: Progress) => getItemState(id, progress) === 'owned';

// What the player has to do now (shown in the backpack): first Imeri's house, then the swamp. What each thing is for
// is written under it (BackpackItem.purpose).
export function getGoal(progress: Progress): string {
  if (isDesafio1Completado(progress)) return '¡Atravesaste el pantano! Busca la casa del elfo, suspendida de un árbol al otro lado.';
  if (missingItems(progress).length) return 'En la casa de Imeri te esperan la gema, la soga y las 5 pociones.';
  return 'Cruza el Pantano de la Tristeza hasta la otra orilla, hacia el árbol gigante del elfo.';
}

// What is left to pick up in Imeri's house, as it reads in a sentence.
function missingItems(progress: Progress): string[] {
  const items = collected(progress);
  const pociones = POTION_IDS.length - countPociones(progress);
  const missing = [...(items.includes('gema') ? [] : ['la gema']), ...(items.includes('soga') ? [] : ['la soga'])];
  if (pociones > 0) missing.push(pociones === POTION_IDS.length ? 'las 5 pociones' : pociones === 1 ? 'la última poción' : `${pociones} pociones más`);
  return missing;
}

// Where each step of Challenge 1 happens (the ground there): the notice board by the gate, the villager woman by the
// well, Imeri in front of her house, the house itself and the way into the swamp (where the road meets the mud).
const TABLON = { x: -51.4, y: 10.6, z: 19.9 };
const ALDEANA = { x: -77.6, y: 10.9, z: 20.4 };
const IMERI = { x: 10.5, y: 10.3, z: 41.5 };
const CASA_IMERI = { x: 16, y: 10.1, z: 44 };
const PANTANO = { x: 60, y: 7.8, z: 8 };
// The far shore of the swamp, where the mud ends toward the valley of the giant tree (the elf's house is 25 m beyond).
// Players told to "cross the swamp" walked straight on, toward the mountain: inside the swamp this shore is marked.
const SALIDA_PANTANO = { x: -38, y: 9, z: -100 };

// The step of Challenge 1 the player is on, in one line, and where it happens. It names the place to go, never what
// is left to do there nor how many enemies remain: finding that out is the player's part.
export function getObjective(progress: Progress, there = false): Objective {
  if (!progress?.openedMayorLetter) return { text: 'Lee el anuncio del alcalde en el tablón, junto al portón.', at: TABLON };
  if (progress.aldeanoHelp !== 'accepted') {
    const text = progress.aldeanoHelp === 'rejected' ? 'Vuelve con la aldeana y acepta su ayuda: sin ella, la casa de Imeri sigue cerrada.' : 'Habla con la aldeana, junto al pozo de la plaza.';
    return { text, at: ALDEANA };
  }
  if (progress.imeriHelp !== 'accepted') {
    const text = progress.imeriHelp === 'rejected' ? 'Vuelve con Imeri y acepta su ayuda: sin sus objetos no cruzarás el pantano.' : 'Sigue el camino hasta la casa de Imeri y habla con ella.';
    return { text, at: IMERI };
  }
  // General on purpose: it names everything Imeri offers, not what this player still lacks. Whoever walks into the
  // swamp without something has chosen to: from then on the objective is the swamp's.
  if (missingItems(progress).length && !there) return { text: 'Entra a la casa de Imeri y recoge lo que te ofrece: la gema, la soga y las 5 pociones.', at: CASA_IMERI };
  if (there) return { text: 'Cruza el Pantano de la Tristeza hasta la otra orilla: la luz dorada marca la salida.', at: PANTANO, exit: SALIDA_PANTANO };
  return { text: 'Cruza el Pantano de la Tristeza.', at: PANTANO, exit: SALIDA_PANTANO };
}

// What the villager woman says, in a few words, to a player who already accepted her help: where to go now, never
// how to use what they carry. Each one is
// a fixed line, so her recorded voice says the same words.
export function getAldeanaHint(progress: Progress): Hint {
  if (isDesafio1Completado(progress)) {
    return {
      voice: '01_aldeana_10',
      paragraphs: ['¡Cruzaste el Pantano de la Tristeza, criatura! En la villa ya se habla de ti. Al otro lado del pantano, al pie del árbol gigante, vive un elfo: búscalo, él conoce el Bosque de la Oscuridad.'],
    };
  }
  if (progress?.imeriHelp === 'rejected') {
    return { voice: '01_aldeana_07', paragraphs: ['Imeri me contó que no quisiste su ayuda. Vuelve con ella y acéptala: sin sus cosas nadie cruza el pantano.'] };
  }
  if (progress?.imeriHelp !== 'accepted') {
    return {
      voice: '01_aldeana_06',
      paragraphs: ['Ve a la casa de Imeri, la cazadora que mejor conoce el pantano. Sal por el portón y sigue el camino: la columna de luz dorada te marca dónde está. Ella te espera frente a su casa.'],
    };
  }
  if (missingItems(progress).length) {
    return { voice: '01_aldeana_08', paragraphs: ['Imeri ya te abrió su puerta. Vuelve a su casa y recoge la gema, la soga y las cinco pociones: sin eso no cruzarás el pantano.'] };
  }
  return {
    voice: '01_aldeana_09',
    paragraphs: ['Ya llevas todo lo de Imeri. Ve al Pantano de la Tristeza: allí te esperan el Golem y los zumbadores. Cómo vencerlos tendrás que descubrirlo tú, criatura.'],
  };
}

// What Imeri says, in a few words, to a player who already accepted her help: what to do now.
export function getImeriHint(progress: Progress): Hint {
  if (isDesafio1Completado(progress)) {
    return {
      voice: '01_imeri_07',
      paragraphs: ['¡Cruzaste el pantano! Pocos lo han logrado. Ya no me necesitas: al otro lado, al pie del árbol gigante, vive un elfo. Búscalo, él conoce el Bosque de la Oscuridad.'],
    };
  }
  if (missingItems(progress).length) {
    return {
      voice: '01_imeri_05',
      paragraphs: ['Mi puerta está abierta. Entra y recoge la gema, la soga y las cinco pociones: con ellas se prepara el insecticida. Lo que recojas queda en tu mochila.'],
    };
  }
  return {
    voice: '01_imeri_06',
    paragraphs: [
      'Ya llevas todo. El pantano te espera, con su Golem, sus zumbadores y sus pozos. Lo que guardas en la mochila te servirá, pero cómo usarlo tendrás que descubrirlo tú.',
    ],
  };
}

// Said on walking out of the swamp with the Golem or the zumbadores still there: what is left to do in it, and that
// the elf will not be there until it is done.
export function getPending(progress: Progress): string | null {
  if (isDesafio1Completado(progress)) return null;
  const zumbadores = ZUMBADOR_COUNT - defeatedZumbadores(progress);
  const left = [
    ...(progress?.golemDefeated ? [] : ['apagar la luz azul del Golem']),
    ...(zumbadores > 0 ? [zumbadores === 1 ? 'acabar con el último zumbador' : `acabar con ${zumbadores} zumbadores`] : []),
  ];
  return `Aún no has superado el Pantano de la Tristeza: te falta ${listed(left)}. Hasta entonces el elfo no saldrá a recibirte.`;
}

const answerLabel =(help: string) => (help === 'accepted' ? 'Aceptó la ayuda' : help === 'rejected' ? 'Rechazó la ayuda' : 'Pendiente');

// Steps of Challenge 1 in order, as the admin dashboard shows them for each player.
function getMissionSteps(progress: Progress): MissionStep[] {
  const items = collected(progress);
  const pociones = countPociones(progress);
  const zumbadores = defeatedZumbadores(progress);
  const aldeana = progress?.aldeanoHelp ?? 'pending';
  const imeri = progress?.imeriHelp ?? 'pending';

  return [
    { id: 'carta', label: 'Leer el anuncio del alcalde', detail: 'Tablón de anuncios junto al portón de la Villa de Boj', done: progress?.openedMayorLetter === true },
    { id: 'aldeana', label: 'Aceptar la ayuda de la aldeana', detail: 'Junto al pozo de la plaza de la Villa de Boj', done: aldeana === 'accepted', status: answerLabel(aldeana) },
    { id: 'imeri', label: 'Aceptar la ayuda de Imeri', detail: 'Frente a su casa; abre la puerta y activa la mochila', done: imeri === 'accepted', status: progress?.interactedWithImeri ? answerLabel(imeri) : 'Sin hablar' },
    { id: 'gema', label: 'Recoger la gema', detail: 'Interior de la casa de Imeri', done: items.includes('gema') },
    { id: 'soga', label: 'Recoger la soga', detail: 'Interior de la casa de Imeri', done: items.includes('soga') },
    { id: 'insecticida', label: 'Preparar el insecticida', detail: 'Recoger las 5 pociones', done: pociones === POTION_IDS.length, status: `${pociones}/${POTION_IDS.length} pociones` },
    { id: 'zumbadores', label: 'Acabar con los zumbadores', detail: 'Con el insecticida, en el Pantano de la Tristeza', done: zumbadores >= ZUMBADOR_COUNT, status: `${zumbadores}/${ZUMBADOR_COUNT}` },
    { id: 'golem', label: 'Desactivar al Golem', detail: 'Con la gema, en el Pantano de la Tristeza', done: progress?.golemDefeated === true },
  ];
}

export function getMissionSummary(progress: Progress) {
  const steps = getMissionSteps(progress);
  const done = steps.filter((step) => step.done).length;
  return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), completed: isDesafio1Completado(progress) };
}
