import type { MissionStep, Objective } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';

// Rules of the closing story, as pure functions of the saved progress (shared with the admin dashboard). From the
// scene schedule: on the summit a dryad welcomes the player at the sanctuary door and invites them in; on the altar
// under the tower is the wooden chalice everyone was looking for.

type Progress = Partial<GameProgress> | undefined;

// The summit is only reached through the tunnels (Challenge 3).
export const isUnlocked = (progress: Progress) => progress?.mision3Completada === true;
// The dryad opens the silver willow door once she has spoken.
export const isSantuarioAbierto = (progress: Progress) => progress?.interactedWithDriada === true;
export const isCalizTomado = (progress: Progress) => progress?.calizTomado === true;
export const isJuegoCompletado = (progress: Progress) => progress?.juegoCompletado === true;

// The plaza in front of the sanctuary doors (the ground there), where the dryad comes out.
const SANTUARIO = { x: 148, y: 52, z: -153 };

// The step of the closing story the player is on, in one line, and where it happens.
export function getObjective(progress: Progress): Objective {
  if (!isSantuarioAbierto(progress)) return { text: 'Sigue la avenida hasta el santuario del resplandor verde y habla con la dríada.', at: SANTUARIO };
  return { text: 'Entra al santuario y toma el cáliz del altar.', at: SANTUARIO };
}

// Total defeats ("bajos") suffered along the whole game.
export const countDerrotas = (progress: Progress) => Object.values(progress?.derrotas ?? {}).reduce((sum, count) => sum + (Number(count) || 0), 0);

// Steps of the closing story in order, as the admin dashboard shows them for each player.
export function getCierreSummary(progress: Progress) {
  const steps: MissionStep[] = [
    { id: 'cumbre', label: 'Llegar a la Cumbre de la Desolación', detail: 'Por los túneles, tras vencer al ogro', done: isUnlocked(progress) },
    { id: 'driada', label: 'Convencer a la dríada', detail: 'Frente a las puertas de sauce del santuario', done: isSantuarioAbierto(progress) },
    { id: 'caliz', label: 'Despertar la luz del cáliz', detail: 'La dríada posa su mano sobre él, en el altar del santuario', done: isCalizTomado(progress) },
  ];
  const done = steps.filter((step) => step.done).length;
  return { unlocked: isUnlocked(progress), steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), completed: isJuegoCompletado(progress) };
}
