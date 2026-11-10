import type { MissionStep } from '@/game/challenges/types';
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

// Total defeats ("bajos") suffered along the whole game.
export const countDerrotas = (progress: Progress) => Object.values(progress?.derrotas ?? {}).reduce((sum, count) => sum + (Number(count) || 0), 0);

// Steps of the closing story in order, as the admin dashboard shows them for each player.
export function getCierreSummary(progress: Progress) {
  const steps: MissionStep[] = [
    { id: 'cumbre', label: 'Llegar a la Cumbre de la Desolación', detail: 'Por los túneles, tras vencer al ogro', done: isUnlocked(progress) },
    { id: 'driada', label: 'Escuchar a la dríada', detail: 'Frente a las puertas de sauce del santuario', done: isSantuarioAbierto(progress) },
    { id: 'caliz', label: 'Tomar el cáliz', detail: 'Sobre el altar, bajo la torre del santuario', done: isCalizTomado(progress) },
  ];
  const done = steps.filter((step) => step.done).length;
  return { unlocked: isUnlocked(progress), steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), completed: isJuegoCompletado(progress) };
}
