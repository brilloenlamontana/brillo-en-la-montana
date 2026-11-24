import { listText } from '@/game/challenges/listText';
import type { ItemState, MissionStep, Objective } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';
import { isDesafio1Completado } from '../desafio1/mission';
import { ELFO_COLLECTIBLES, type ElfoItemId } from './items';

// Rules of Challenge 2 so far, as pure functions of the saved progress (shared with the admin dashboard). From the
// scene schedule: the forest has three dangers (wild goblins, poisonous fruit trees, shifting paths) and the elf's
// tools answer them; the elven sword defeats the goblins and the lens tells the good fruit from the poisonous one.

type Progress = Partial<GameProgress> | undefined;

// Goblins roaming the Dark Forest.
export const DUENDE_COUNT = 6;
// Good fruits the player has to eat to get through the forest's hunger.
export const FRUTOS_NEEDED = 3;

// Whether the forest fruit at this index (node order of BosqueManzanas.glb) is good. Fixed, so it is the same fruit
// for every player and every visit; about a third of them are good. They all look red: only the lens tells them apart.
export const isFrutoBueno = (index: number) => (Math.imul(index + 1, 2654435761) >>> 0) % 100 < 35;

const collected = (progress: Progress) => progress?.collectedItems ?? [];
const defeatedDuendes = (progress: Progress) => new Set(progress?.duendesDefeated ?? []).size;
export const frutosEaten = (progress: Progress) => new Set(progress?.frutosComidos ?? []).size;

export const allDuendesDefeated = (progress: Progress) => defeatedDuendes(progress) >= DUENDE_COUNT;
// Fed: the forest's hunger no longer applies.
export const isFed = (progress: Progress) => frutosEaten(progress) >= FRUTOS_NEEDED;
// Hidden rock wall lowered by activating the map.
export const isMapaActivado = (progress: Progress) => progress?.mapaActivado === true;

// Challenge 2 is completely finished when duendes are defeated, player is fed, and map is activated.
export const isDesafio2Completado = (progress: Progress) =>
  progress?.mision2Completada === true || (allDuendesDefeated(progress) && isFed(progress) && isMapaActivado(progress));

// The elf only waits at the foot of his tree once the swamp was crossed (Challenge 1 completed).
export const isElfoPresent = (progress: Progress) => isDesafio1Completado(progress);

// Accepting his help opens his door and fills the backpack with his tools.
export const isElfoHouseUnlocked = (progress: Progress) => progress?.elfoHelp === 'accepted';
export const isBackpackActive = isElfoHouseUnlocked;

// The sword leaves the backpack once every goblin is defeated; the lens once the player is fed;
// the map once the hidden wall has been lowered.
export function getItemState(id: ElfoItemId, progress: Progress): ItemState {
  if (id === 'espada' && allDuendesDefeated(progress)) return 'spent';
  if (id === 'lente' && isFed(progress)) return 'spent';
  if (id === 'mapa' && isMapaActivado(progress)) return 'spent';
  return collected(progress).includes(id) ? 'owned' : 'missing';
}

// How each tool is named in a sentence.
const ITEM_LABEL: Record<ElfoItemId, string> = { espada: 'la espada élfica', lente: 'el lente revelador', mapa: 'el mapa del bosque' };

// Where each step of Challenge 2 happens (the ground there): the elf at the foot of his tree and the heart of the forest.
const ELFO = { x: -36.4, y: 10.2, z: -126.4 };
const BOSQUE = { x: -24, y: 13, z: -214 };

// The step of Challenge 2 the player is on, in one line, and where it happens.
export function getObjective(progress: Progress): Objective {
  if (!isElfoHouseUnlocked(progress)) {
    const text =
      progress?.elfoHelp === 'rejected'
        ? 'Vuelve con el elfo y acepta su ayuda: sin sus herramientas no saldrás del bosque.'
        : 'Busca al elfo al pie del árbol gigante, al otro lado del pantano, y habla con él.';
    return { text, at: ELFO };
  }
  const missing = ELFO_COLLECTIBLES.filter(({ id }) => !collected(progress).includes(id)).map(({ id }) => ITEM_LABEL[id]);
  if (missing.length) return { text: `Sube a la casa del elfo, en la copa del árbol, y recoge ${listText(missing)}.`, at: ELFO };
  return { text: `En el Bosque de la Oscuridad: ${listText(forestTasks(progress))}.`, at: BOSQUE };
}

// What is left to do in the forest.
function forestTasks(progress: Progress): string[] {
  const duendes = DUENDE_COUNT - defeatedDuendes(progress);
  const frutos = FRUTOS_NEEDED - frutosEaten(progress);
  return [
    ...(duendes > 0 ? [duendes === 1 ? 'vence al último duende con la espada' : `vence a los ${duendes} duendes con la espada`] : []),
    ...(frutos > 0 ? [`come ${frutos === 1 ? 'una fruta amarilla más' : `${frutos} frutas amarillas`} (míralas con el lente)`] : []),
    ...(isMapaActivado(progress) ? [] : ['usa el mapa para bajar el muro oculto']),
  ];
}

// What the player still has to fetch before the forest can be crossed, and from whom; null when nothing is missing.
function forestLack(progress: Progress): string | null {
  if (!isElfoHouseUnlocked(progress)) return 'vuelve al árbol gigante y acepta la ayuda del elfo';
  const missing = ELFO_COLLECTIBLES.filter(({ id }) => getItemState(id, progress) === 'missing').map(({ id }) => ITEM_LABEL[id]);
  return missing.length ? `sube a la casa del elfo, en la copa del árbol, y recoge ${listText(missing)}` : null;
}

// Said on walking into the forest without what it takes to cross it.
export function getUnprepared(progress: Progress): string | null {
  if (isDesafio2Completado(progress)) return null;
  const lack = forestLack(progress);
  return lack ? `¡Cuidado! No estás listo para el Bosque de la Oscuridad: los duendes y el hambre te quitarán la vida. Antes, ${lack}.` : null;
}

// Said on walking out of the forest with something still to do in it.
export function getPending(progress: Progress): string | null {
  if (isDesafio2Completado(progress)) return null;
  const lack = forestLack(progress);
  return `El Bosque de la Oscuridad sigue pendiente: ${listText(forestTasks(progress))}. ${lack ? `Para eso, ${lack}. ` : ''}Hasta entonces no se abre el paso al pueblo minero.`;
}

// What the player has to do now (shown in the backpack).
export function getGoal(progress: Progress): string {
  if (isDesafio2Completado(progress)) {
    return '¡Superaste el Bosque de la Oscuridad! Tu vida está recuperada y el sendero hacia la cumbre está despejado: sigue las flechas doradas del suelo hasta la salida del bosque.';
  }
  const missing = ELFO_COLLECTIBLES.filter(({ id }) => !collected(progress).includes(id)).map(({ id }) => ITEM_LABEL[id]);
  if (missing.length) return `Sube a la casa del elfo, en la copa del árbol gigante, y recoge ${listText(missing)}.`;
  const tasks: string[] = [];
  const duendes = DUENDE_COUNT - defeatedDuendes(progress);
  if (duendes > 0) {
    tasks.push(
      `${duendes === DUENDE_COUNT ? 'Los duendes salvajes' : `Los ${duendes} duendes que quedan`} te perseguirán: acaba con ellos usando la espada cuando estén cerca.`,
    );
  }
  const frutos = FRUTOS_NEEDED - frutosEaten(progress);
  if (frutos > 0) {
    tasks.push(
      `El hambre te obligará a comer: mira por el lente y come ${frutos === 1 ? 'una fruta amarilla más' : `${frutos} frutas amarillas`}; las que siguen rojas son venenosas.`,
    );
  }
  if (!isMapaActivado(progress)) {
    tasks.push('Usa el mapa del bosque para hacer descender el muro oculto y despejar el sendero.');
  }
  if (tasks.length) return `Adéntrate en el Bosque de la Oscuridad. ${tasks.join(' ')}`;
  return 'Acabaste con los duendes, saciaste tu hambre y despejaste el sendero oculto. Sigue las flechas doradas del suelo hasta la salida del bosque.';
}

const answerLabel = (help: string) => (help === 'accepted' ? 'Aceptó la ayuda' : help === 'rejected' ? 'Rechazó la ayuda' : 'Pendiente');

// Steps of Challenge 2 reached so far, as the admin dashboard shows them.
export function getDesafio2Summary(progress: Progress) {
  const elfo = progress?.elfoHelp ?? 'pending';
  const items = collected(progress);
  const duendes = defeatedDuendes(progress);
  const frutos = frutosEaten(progress);
  const completed = isDesafio2Completado(progress);
  const steps: MissionStep[] = [
    {
      id: 'elfo',
      label: 'Aceptar la ayuda del elfo',
      detail: 'Al pie del árbol gigante, después de cruzar el pantano',
      done: elfo === 'accepted',
      status: progress?.interactedWithElfo ? answerLabel(elfo) : 'Sin hablar',
    },
    ...ELFO_COLLECTIBLES.map(({ id, name }) => ({ id: `recoger-${id}`, label: `Recoger: ${name}`, detail: 'Casa del elfo, en la copa del árbol', done: items.includes(id) })),
    { id: 'duendes', label: 'Acabar con los duendes', detail: 'Con la espada élfica, en el Bosque de la Oscuridad', done: duendes >= DUENDE_COUNT, status: `${duendes}/${DUENDE_COUNT}` },
    {
      id: 'frutos',
      label: 'Comer frutas buenas',
      detail: 'Las que el lente revelador muestra amarillas',
      done: frutos >= FRUTOS_NEEDED,
      status: `${Math.min(frutos, FRUTOS_NEEDED)}/${FRUTOS_NEEDED}`,
    },
    {
      id: 'mapa',
      label: 'Despejar el sendero oculto',
      detail: 'Con el mapa del bosque, haciendo descender el muro de roca',
      done: isMapaActivado(progress),
    },
  ];
  const done = steps.filter((step) => step.done).length;
  return { unlocked: isElfoPresent(progress), steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), completed };
}
