import type { GameProgress } from '../store/progressStore';
import { POCION_IDS, type MochilaItemId } from './recogibles';

// Zumbadores escondidos en los pozos del pantano.
export const ZUMBADOR_COUNT = 10;

type Progress = Partial<GameProgress> | undefined;

const collected = (progress: Progress) => progress?.collectedItems ?? [];
const defeatedZumbadores = (progress: Progress) => new Set(progress?.zumbadoresDefeated ?? []).size;

export const countPocionesFrom = (progress: Progress) => POCION_IDS.filter((id) => collected(progress).includes(id)).length;
export const allZumbadoresDefeated = (progress: Progress) => defeatedZumbadores(progress) >= ZUMBADOR_COUNT;

// La puerta de Imeri solo se abre si se aceptó la ayuda del aldeano (Imeri está en casa) y luego la de Imeri.
export const isHouseUnlocked = (progress: Progress) => progress?.aldeanoHelp === 'accepted' && progress?.imeriHelp === 'accepted';
export const isBackpackActive = (progress: Progress) => progress?.imeriHelp === 'accepted';

// Con el golem y todos los zumbadores derrotados los pozos ya no tragan a nadie (y la soga deja de hacer falta).
export const areWellsSafe = (progress: Progress) => progress?.golemDefeated === true && allZumbadoresDefeated(progress);

export type MochilaItemState = 'missing' | 'owned' | 'spent';

// Las 5 pociones juntas son el insecticida. Cada objeto desaparece de la mochila cuando ya cumplió su función:
// la gema al desactivar al golem, el insecticida al morir el último zumbador y la soga cuando ya no quedan enemigos.
export function getMochilaItemState(id: MochilaItemId, progress: Progress): MochilaItemState {
  const items = collected(progress);
  if (id === 'gema') return progress?.golemDefeated ? 'spent' : items.includes('gema') ? 'owned' : 'missing';
  if (id === 'soga') return areWellsSafe(progress) ? 'spent' : items.includes('soga') ? 'owned' : 'missing';
  if (allZumbadoresDefeated(progress)) return 'spent';
  return countPocionesFrom(progress) === POCION_IDS.length ? 'owned' : 'missing';
}

export const hasMochilaItem = (id: MochilaItemId, progress: Progress) => getMochilaItemState(id, progress) === 'owned';

export type MissionStep ={ id: string; label: string; detail: string; done: boolean; status?: string };

// Pasos de la Misión 1, en orden; los usa la ficha de cada jugador en el administrador.
export function getMissionSteps(progress: Progress): MissionStep[] {
  const items = collected(progress);
  const pociones = countPocionesFrom(progress);
  const zumbadores = defeatedZumbadores(progress);
  const aldeano = progress?.aldeanoHelp ?? 'pending';
  const imeri = progress?.imeriHelp ?? 'pending';
  const answer = (help: string) => (help === 'accepted' ? 'Aceptó la ayuda' : help === 'rejected' ? 'Rechazó la ayuda' : 'Pendiente');

  return [
    { id: 'carta', label: 'Leer el anuncio del alcalde', detail: 'Pergamino frente al portón de Villa Boj', done: progress?.openedMayorLetter === true },
    { id: 'aldeano', label: 'Aceptar la ayuda del aldeano', detail: 'En la plaza de Villa Boj', done: aldeano === 'accepted', status: answer(aldeano) },
    { id: 'imeri', label: 'Aceptar la ayuda de Imeri', detail: 'Frente a su casa; abre la puerta y activa la mochila', done: imeri === 'accepted', status: progress?.interactedWithImeri ? answer(imeri) : 'Sin hablar' },
    { id: 'gema', label: 'Recoger la gema', detail: 'Interior de la casa de Imeri', done: items.includes('gema') },
    { id: 'soga', label: 'Recoger la soga', detail: 'Interior de la casa de Imeri', done: items.includes('soga') },
    { id: 'insecticida', label: 'Preparar el insecticida', detail: 'Recoger las 5 pociones', done: pociones === POCION_IDS.length, status: `${pociones}/${POCION_IDS.length} pociones` },
    { id: 'zumbadores', label: 'Acabar con los zumbadores', detail: 'Con el insecticida, en el Pantano de la Tristeza', done: zumbadores >= ZUMBADOR_COUNT, status: `${zumbadores}/${ZUMBADOR_COUNT}` },
    { id: 'golem', label: 'Desactivar al Golem', detail: 'Con la gema, en el Pantano de la Tristeza', done: progress?.golemDefeated === true },
  ];
}

export function getMissionSummary(progress: Progress) {
  const steps = getMissionSteps(progress);
  const done = steps.filter((step) => step.done).length;
  return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), completed: progress?.mision1Completada === true };
}
