import { useAudioStore } from '@/game/engine/audio/audioStore';

// Silences or brings back every sound of the game (music, ambience, effects and voices). Remembered on this device.
export function SoundToggle() {
  const muted = useAudioStore((state) => state.muted);
  const label = muted ? 'Activar el sonido' : 'Silenciar el juego';

  return (
    <>
      <button
        type="button"
        onClick={() => useAudioStore.getState().toggleMuted()}
        title={label}
        aria-label={label}
        aria-pressed={muted}
        className="flex items-center justify-center w-8 h-8 rounded-full text-slate-700 hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
          {muted ? (
            <path d="m16 9 5 6m0-6-5 6" />
          ) : (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          )}
        </svg>
      </button>
      <div className="w-px h-5 bg-slate-200" />
    </>
  );
}
