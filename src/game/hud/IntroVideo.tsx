import { useEffect, useRef, useState } from 'react';
import { stopVoice } from '@/game/engine/audio/audio';
import { useNoMusic } from '@/game/engine/audio/useMenuMusic';
import { useUIStore } from '@/store/uiStore';

const INTRO_URL = '/video/video-introductorio.mp4';

// The introduction of the story, full screen, shown once before the world opens for the first time (WorldPage). It
// starts by itself with sound; where the browser does not allow that without a tap, a button starts it. It is watched
// to the end (there is no skipping it), but a video that cannot be played never keeps the player out of the game.
// `replay`: the player asked to see it again from the game (IntroButton): then it can be closed at any moment, with
// its button or Escape.
export function IntroVideo({ onDone, replay = false }: { onDone: () => void; replay?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'blocked'>('loading');
  // The video brings its own sound: the main theme of the pages before it stops, and returns with the world's loading.
  useNoMusic();

  const play = () => {
    video.current?.play().catch(() => setStatus('blocked'));
  };
  useEffect(play, []);

  useEffect(() => {
    if (!replay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replay, onDone]);

  return (
    <main className="fixed inset-0 z-[9999] bg-black text-papel-50 font-sans select-none">
      <video
        ref={video}
        src={INTRO_URL}
        className="w-full h-full object-contain"
        preload="auto"
        playsInline
        onPlaying={() => setStatus('playing')}
        onWaiting={() => setStatus((current) => (current === 'blocked' ? current : 'loading'))}
        onEnded={onDone}
        onError={onDone}
      />
      {status === 'loading' && (
        <p role="status" className="absolute inset-x-0 bottom-20 text-center text-base sm:text-lg font-bold drop-shadow-md">
          Cargando la introducción...
        </p>
      )}
      {status === 'blocked' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <button
            type="button"
            onClick={play}
            className="rounded-xl bg-oro-400 px-6 py-3 text-lg font-bold text-madera-900 shadow-lg cursor-pointer hover:brightness-110"
          >
            Ver la introducción
          </button>
        </div>
      )}
      {replay && (
        <button
          type="button"
          onClick={onDone}
          className="absolute top-[max(12px,env(safe-area-inset-top,12px))] right-[max(12px,env(safe-area-inset-right,12px))] rounded-lg border-2 border-papel-50/70 bg-black/60 px-4 py-2 text-sm font-bold text-papel-50 cursor-pointer hover:bg-black/80 active:scale-95 transition-all"
        >
          Saltar video ▸▸
        </button>
      )}
    </main>
  );
}

// The button of the top bar that plays the introduction video again, over the game, whenever the player wants.
export function IntroButton() {
  const label = 'Ver de nuevo el video de introducción';
  const open = () => {
    const ui = useUIStore.getState();
    // The video takes the screen: the backpack closes and whoever was speaking stops. A narration stays open under it.
    ui.setBackpackOpen(false);
    stopVoice();
    ui.setIntroOpen(true);
  };
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.currentTarget.blur();
          open();
        }}
        title={label}
        aria-label={label}
        className="flex items-center justify-center w-8 h-8 rounded-full text-madera-700 hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-madera-600"
      >
        {/* A film frame with a play triangle. */}
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
        </svg>
      </button>
      <div className="w-px h-5 bg-papel-300" />
    </>
  );
}
