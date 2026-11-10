import { useId } from 'react';
import { getBonosSummary } from '@/game/challenges/bonos';
import { useVoice } from '@/game/engine/audio/useVoice';
import { ParchmentButton } from '@/game/hud/ParchmentDialog';
import { STARS, useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from './dialogs';
import { countDerrotas } from './mission';

const formatDate = (iso: string | undefined) => (iso ? new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'long' }) : 'Completado');

function Star({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"
        fill={lit ? '#f4d03f' : 'none'}
        stroke={lit ? '#b7791f' : '#8d6e63'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Row({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 border-b border-[#5c3a21]/15 last:border-b-0">
      <span className="flex items-center gap-2">
        <span className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-600 text-white' : 'bg-[#5c3a21]/20 text-[#5c3a21]'}`}>
          {done ? '✓' : '–'}
        </span>
        {label}
      </span>
      <span className="text-[#5c3a21] font-semibold text-right">{value}</span>
    </li>
  );
}

// Final victory of the game: the chalice was taken from the altar. Sums up what the player achieved: the three
// challenges, the stars kept (each "bajo" cost one), the defeats and the two bonuses. No backdrop blur over the canvas.
export function VictoriaDialog() {
  const isOpen = useDialogOpen(DIALOG.victoria);
  const progress = useProgressStore((state) => state.progress);
  const titleId = useId();
  const bonos = getBonosSummary(progress);
  useVoice(isOpen ? ['04_narrador_09', bonos.completed ? '04_narrador_10' : '04_narrador_11'] : null);
  if (!isOpen) return null;

  const derrotas = countDerrotas(progress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 select-none">
      <div
        role="dialog"
        aria-labelledby={titleId}
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#f4e4bc] text-[#3e2723] border-2 sm:border-[3px] border-[#5c3a21] rounded-2xl shadow-2xl p-4 sm:p-7 font-serif"
      >
        <p className="text-center text-xs sm:text-sm italic text-[#5c3a21]">Brillo en la montaña</p>
        <h2 id={titleId} className="text-center text-2xl sm:text-3xl font-bold mb-2">
          ¡Fin del juego: recuperaste el cáliz!
        </h2>
        <div className="flex justify-center gap-1 mb-3" role="img" aria-label={`${progress.estrellas} de ${STARS} estrellas`}>
          {Array.from({ length: STARS }, (_, i) => (
            <Star key={i} lit={i < progress.estrellas} />
          ))}
        </div>
        <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed font-sans">
          <p>
            Sobre el altar, bajo la torre, tomas el cáliz de madera con grabados de hojas de sauce y runas en el borde: brilla más de lo que jamás imaginaste. Su
            resplandor verde sube por la aguja del santuario y señala el camino de regreso a quienes tuvieron que abandonar su hogar.
          </p>
          <p>
            El frío cede y la tierra vuelve a ser fértil: todo vuelve a estar bien. Atravesaste el Pantano de la Tristeza, el Bosque de la Oscuridad y los túneles de
            la Cumbre de la Desolación; el juego ha terminado y este es el resumen de tu aventura:
          </p>
        </div>
        <ul className="mt-3 text-xs sm:text-sm font-sans">
          <Row label="Desafío 1 · Pantano de la Tristeza" value={formatDate(progress.mision1CompletadaEn)} done={progress.mision1Completada} />
          <Row label="Desafío 2 · Bosque de la Oscuridad" value={formatDate(progress.mision2CompletadaEn)} done={progress.mision2Completada} />
          <Row label="Desafío 3 · Túneles de la Cumbre" value={formatDate(progress.mision3CompletadaEn)} done={progress.mision3Completada} />
          <Row label="Estrellas conservadas" value={`${progress.estrellas} de ${STARS}`} done={progress.estrellas === STARS} />
          <Row label="Bajos sufridos en el camino" value={String(derrotas)} done={derrotas === 0} />
          <Row label="Bono 1 · Anillo de oro de la estatua" value={progress.bono1Completado ? 'Obtenido' : 'Sin encontrar'} done={progress.bono1Completado} />
          <Row label="Bono 2 · Amuleto del hada" value={progress.bono2Completado ? 'Obtenido' : 'Sin encontrar'} done={progress.bono2Completado} />
        </ul>
        <p className="mt-3 text-xs sm:text-sm font-sans italic text-[#5c3a21]">
          {bonos.completed
            ? 'Encontraste los dos bonos ocultos: nada quedó por descubrir.'
            : 'Aún quedan bonos ocultos en el pantano y en el bosque: puedes volver a buscarlos.'}
        </p>
        <div className="mt-5 pt-3 border-t border-[#5c3a21]/20 flex justify-end">
          <ParchmentButton onClick={() => useUIStore.getState().closeDialog()}>Seguir explorando</ParchmentButton>
        </div>
      </div>
    </div>
  );
}
