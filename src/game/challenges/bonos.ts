import type { MissionStep } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';

// The two optional riddles of the story ("Acertijo 1" and "Acertijo 2" of the scene schedule), as pure functions of
// the saved progress (shared by the game, its HUD and the admin dashboard). Each lives in the challenge it belongs to:
// the statue of the ruined hut at the swamp exit (desafio1/chozaEstatua) and the fairy's clearing near the forest
// exit (desafio2/claroDelHada).

type Progress = Partial<GameProgress> | undefined;

// Ids of the bonus rewards in progress.collectedItems.
export const ANILLO_ORO = 'anilloOro';
export const AMULETO_HADA = 'amuletoHada';

export const isBono1Completado = (progress: Progress) => progress?.bono1Completado === true;
export const isBono2Completado = (progress: Progress) => progress?.bono2Completado === true;
export const countBonos = (progress: Progress) => Number(isBono1Completado(progress)) + Number(isBono2Completado(progress));

// Steps of both bonuses, as the admin dashboard shows them for each player.
export function getBonosSummary(progress: Progress) {
  const steps: MissionStep[] = [
    { id: 'estatua-limpia', label: 'Bono 1 · Limpiar el rostro de la estatua', detail: 'Choza en ruinas a la salida del pantano', done: progress?.estatuaLimpia === true },
    { id: 'estatua-fuego', label: 'Bono 1 · Encender el fuego en el plato', detail: 'A los pies de la estatua', done: progress?.estatuaEncendida === true },
    { id: 'anillo', label: 'Bono 1 · Recibir el anillo de oro', detail: 'De las manos abiertas de la estatua', done: isBono1Completado(progress) },
    { id: 'hada', label: 'Bono 2 · Liberar al hada', detail: 'Cortando las zarzas con la espada élfica, en el claro del bosque', done: progress?.hadaLiberada === true },
    { id: 'amuleto', label: 'Bono 2 · Recibir el amuleto del hada', detail: 'Sobre el atril de raíces del claro', done: isBono2Completado(progress) },
  ];
  const done = steps.filter((step) => step.done).length;
  const bonos = countBonos(progress);
  // Each bonus on its own, for the dashboard: its steps done out of its total.
  const part = (prefix: readonly string[]) => {
    const own = steps.filter((step) => prefix.includes(step.id));
    return { done: own.filter((step) => step.done).length, total: own.length };
  };
  const bono1 = { ...part(['estatua-limpia', 'estatua-fuego', 'anillo']), completed: isBono1Completado(progress) };
  const bono2 = { ...part(['hada', 'amuleto']), completed: isBono2Completado(progress) };
  return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), bonos, totalBonos: 2, completed: bonos === 2, bono1, bono2 };
}
