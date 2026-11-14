import { useEffect, useRef, useState } from 'react';

const INTRO_URL = '/video/video-introductorio.mp4';

// The introduction of the story, full screen, shown once before the world opens for the first time (WorldPage). It
// starts by itself with sound; where the browser does not allow that without a tap, a button starts it. It is watched
// to the end (there is no skipping it), but a video that cannot be played never keeps the player out of the game.
export function IntroVideo({ onDone }: { onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'loading' | 'playing' | 'blocked'>('loading');

  const play = () => {
    video.current?.play().catch(() => setStatus('blocked'));
  };
  useEffect(play, []);

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
    </main>
  );
}
