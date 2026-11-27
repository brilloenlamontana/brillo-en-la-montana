import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { playSfx } from '@/game/engine/audio/audio';
import { MIN_VOICE, useAudioStore, type VolumeChannel } from '@/game/engine/audio/audioStore';

// The bars of the sound panel, top to bottom.
const CANALES: readonly { channel: VolumeChannel; label: string; detail: string }[] = [
  { channel: 'general', label: 'Volumen general', detail: 'Todo el sonido del juego' },
  { channel: 'voces', label: 'Narraciones y voces', detail: 'El narrador y los personajes: siempre se escuchan' },
  { channel: 'musica', label: 'Música', detail: 'Los temas de cada lugar' },
  { channel: 'ambiente', label: 'Sonido de ambiente', detail: 'Viento, bosque, pantano, cuevas' },
  { channel: 'efectos', label: 'Efectos', detail: 'Pasos, golpes, objetos, avisos' },
];

function VolumeIcon({ muted, low }: { muted: boolean; low: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
      {muted ? (
        <path d="m16 9 5 6m0-6-5 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          {!low && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
        </>
      )}
    </svg>
  );
}

// One bar: drag it (or use the arrows while it has focus) to turn that sound up or down.
function Barra({ channel, label, detail }: (typeof CANALES)[number]) {
  const id = useId();
  const value = useAudioStore((state) => state.volumes[channel]);
  const percent = Math.round(value * 100);
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-bold text-sm sm:text-base">
          {label}
        </label>
        <span className="font-mono text-xs sm:text-sm text-[#5c3a21] tabular-nums">{percent} %</span>
      </div>
      <p className="text-[11px] sm:text-xs text-[#5c3a21]/80 mb-1.5">{detail}</p>
      <input
        id={id}
        type="range"
        min={channel === 'voces' ? MIN_VOICE * 100 : 0}
        max={100}
        step={5}
        value={percent}
        onChange={(event) => useAudioStore.getState().setVolume(channel, Number(event.target.value) / 100)}
        // A short tick when the bar is let go, so the effects volume can be heard.
        onPointerUp={() => channel === 'efectos' && playSfx('ui_boton', { volume: 0.8 })}
        className="w-full h-2 cursor-pointer accent-[#5c3a21]"
      />
    </div>
  );
}

// The sound panel: a bar for everything and one per kind of sound, plus silencing music, ambience and effects (the
// voices are always heard: audioStore.MIN_VOICE). It is drawn over the game
// (no backdrop blur over the canvas) and keeps the keys to itself, so the arrows move the bars and not the avatar.
function PanelDeSonido({ onClose, backgroundOnly }: { onClose: () => void; backgroundOnly: boolean }) {
  const titleId = useId();
  const muted = useAudioStore((state) => state.muted);
  const panel = useRef<HTMLDivElement>(null);

  // The keyboard goes to the panel as soon as it opens.
  useEffect(() => panel.current?.focus(), []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The game listens to the keyboard on the window: what is pressed here goes no further.
  const keep = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') event.stopPropagation();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4 select-none" onPointerDown={onClose} onKeyDown={keep} onKeyUp={keep}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onPointerDown={(event) => event.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#f4e4bc] text-[#3e2723] border-2 sm:border-[3px] border-[#5c3a21] rounded-2xl shadow-2xl p-4 sm:p-6 font-serif outline-none"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 id={titleId} className="text-xl sm:text-2xl font-bold">
            Sonido
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar el panel de sonido"
            className="w-8 h-8 rounded-full flex items-center justify-center text-xl font-bold text-[#5c3a21] hover:bg-[#5c3a21]/10 cursor-pointer"
          >
            &times;
          </button>
        </div>
        <div className="divide-y divide-[#5c3a21]/15 font-sans">
          {backgroundOnly ? (
            <Barra channel="musica" label="Música de fondo" detail="La música que suena en esta página" />
          ) : (
            CANALES.map((canal) => <Barra key={canal.channel} {...canal} />)
          )}
        </div>
        {backgroundOnly && <p className="mt-3 text-[11px] sm:text-xs font-sans text-[#5c3a21]">Las voces, el ambiente y los efectos se ajustan dentro del juego, con este mismo botón.</p>}
        {!backgroundOnly && (
        <>
        <p className="mt-3 text-[11px] sm:text-xs font-sans text-[#5c3a21]">
          Aunque silencies el juego, las voces del narrador y de los personajes se siguen escuchando: ellas te dicen qué hacer.
        </p>
        <div className="mt-3 pt-3 border-t border-[#5c3a21]/20 flex flex-wrap items-center justify-between gap-2.5 font-sans">
          <button
            type="button"
            onClick={() => useAudioStore.getState().toggleMuted()}
            aria-pressed={muted}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border-2 text-sm font-bold cursor-pointer transition-colors ${
              muted ? 'bg-[#5c3a21] border-[#3e2723] text-[#f4d03f]' : 'border-[#5c3a21] text-[#5c3a21] hover:bg-[#5c3a21]/10'
            }`}
          >
            <VolumeIcon muted={muted} low={false} />
            {muted ? 'Activar música y efectos' : 'Silenciar música y efectos'}
          </button>
          <button
            type="button"
            onClick={() => useAudioStore.getState().resetVolumes()}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-[#5c3a21] underline underline-offset-2 hover:text-[#3e2723] cursor-pointer"
          >
            Volver a los valores iniciales
          </button>
        </div>
        </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// The sound button of the top bar: it opens the sound panel. Its icon shows whether the game is silenced. The volumes
// are remembered on this device.
// `backgroundOnly`: outside the game (the login page and the registration form) it floats in the top corner and only
// sets the background music; everything else is set in the game.
export function SoundToggle({ backgroundOnly = false }: { backgroundOnly?: boolean }) {
  const channel = backgroundOnly ? 'musica' : 'general';
  const muted = useAudioStore((state) => (!backgroundOnly && state.muted) || state.volumes[channel] === 0);
  const low = useAudioStore((state) => state.volumes[channel] < 0.5);
  const [open, setOpen] = useState(false);
  const label = backgroundOnly ? 'Ajustar la música de fondo' : 'Ajustar el sonido';

  if (backgroundOnly) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={label}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="fixed top-[max(12px,env(safe-area-inset-top,12px))] right-[max(12px,env(safe-area-inset-right,12px))] z-[95] flex items-center justify-center w-10 h-10 rounded-full bg-[#f4e4bc] text-[#5c3a21] border-2 border-[#5c3a21] shadow-[0_4px_12px_rgba(62,39,35,0.35)] hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#f4d03f]"
        >
          <VolumeIcon muted={muted} low={low} />
        </button>
        {open && <PanelDeSonido onClose={() => setOpen(false)} backgroundOnly />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center justify-center w-8 h-8 rounded-full text-madera-700 hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-madera-600"
      >
        <VolumeIcon muted={muted} low={low} />
      </button>
      <div className="w-px h-5 bg-papel-300" />
      {open && <PanelDeSonido onClose={() => setOpen(false)} backgroundOnly={false} />}
    </>
  );
}
