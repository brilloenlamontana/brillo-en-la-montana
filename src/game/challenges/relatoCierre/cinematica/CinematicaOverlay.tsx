import { useEffect, useState } from 'react';
import { playSfx } from '@/game/engine/audio/audio';
import { useVoice } from '@/game/engine/audio/useVoice';
import { CINEMATIC_SECONDS, FADE_SECONDS, SHOT_SECONDS, SHOTS, useCinematicaStore } from './cinematica';

// What is drawn over the canvas during the final cinematic: black bars that hide the HUD, the caption of each shot, a
// fade to black on every cut and a button to skip it. Updated a few times per second, never per frame.
export function CinematicaOverlay() {
  const startedAt = useCinematicaStore((state) => state.startedAt);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => setElapsed((performance.now() - startedAt) / 1000);
    tick();
    const interval = setInterval(tick, 100);
    return () => {
      clearInterval(interval);
      setElapsed(0);
    };
  }, [startedAt]);

  const playing = startedAt !== null;
  const index = Math.min(SHOTS.length - 1, Math.floor(elapsed / SHOT_SECONDS));
  // The narrator reads each caption (04_narrador_03 … 08, one per shot); a soft whoosh marks every cut.
  useVoice(playing ? [`04_narrador_0${index + 3}`] : null);
  useEffect(() => {
    if (playing && index > 0) playSfx('rc_cinematica_corte', { volume: 0.5 });
  }, [playing, index]);

  if (!playing) return null;

  const inShot = elapsed - index * SHOT_SECONDS;
  // Black at each end of a shot, clear in between.
  const black = Math.max(0, 1 - inShot / FADE_SECONDS, 1 - (SHOT_SECONDS - inShot) / FADE_SECONDS);
  const progress = Math.min(1, elapsed / CINEMATIC_SECONDS);

  return (
    <div className="fixed inset-0 z-40 select-none">
      <div className="absolute inset-0 bg-black transition-opacity duration-100" style={{ opacity: Math.min(1, black) }} />
      <div className="absolute inset-x-0 top-0 h-[13vh] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[20vh] bg-black flex flex-col items-center justify-center px-4 sm:px-10 gap-3">
        <p className="max-w-3xl text-center text-[#f4e4bc] font-serif text-sm sm:text-lg leading-snug">{SHOTS[index].caption}</p>
        <div className="w-full max-w-md h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-emerald-400/80" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => useCinematicaStore.getState().finish()}
        className="absolute top-[max(12px,env(safe-area-inset-top,12px))] right-[max(12px,env(safe-area-inset-right,12px))] px-3.5 py-1.5 rounded-lg border border-white/30 bg-black/60 text-white text-xs sm:text-sm font-semibold cursor-pointer hover:bg-black"
      >
        Saltar
      </button>
    </div>
  );
}
