import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { followVoice, playSfx, voiceDurations } from '@/game/engine/audio/audio';

type Tone = 'pergamino' | 'driada' | 'jugador';

type ParchmentDialogProps = {
  // Who speaks, or what is being told.
  title: string;
  subtitle?: string;
  paragraphs: readonly string[];
  // What the speaker asks at the end, answered with the buttons of the footer.
  question?: string;
  // Recorded voices that say it all aloud, in order (ids of docs/sonido/guion_voces.csv).
  voice?: readonly string[];
  tone?: Tone;
  // Told once, when everything has been said.
  onDone?: () => void;
  // Closing it: an × in its top corner, shown once everything has been said.
  onClose?: () => void;
  // Footer with the answers to a question: only shown once everything has been said.
  children?: ReactNode;
};

// The text box shows this much at a time: a long paragraph goes on in the next "page".
const PAGE_CHARS = 250;
// Without a voice (file missing, sound not allowed yet) the text is written at reading pace, after waiting this long
// for the voice to start.
const VOICE_WAIT = 1;
const READING_CHARS_PER_SECOND = 17;
// A breath after the last word, before the answers show up or the next speaker goes on.
const PAUSE_SECONDS = 0.5;

// The box is the parchment scroll (public/sprites-2d/aseets/pergamino.png) stretched to the size of what it holds;
// the padding keeps the text off its rollers and its curled edges. Each voice has its own colour for its name.
const PERGAMINO = '/sprites-2d/aseets/pergamino.png';
// Downloaded ahead, so the first narration does not show an empty box.
if (typeof window !== 'undefined') new Image().src = PERGAMINO;
const TONES: Record<Tone, { name: string }> = {
  pergamino: { name: 'text-[#5c3a21]' },
  driada: { name: 'text-emerald-800' },
  jugador: { name: 'text-[#C8102E]' },
};

type Page = { text: string; start: number; question: boolean };

// Cuts the text into pages at the end of a sentence.
function paginate(paragraphs: readonly string[], question: string | undefined): Page[] {
  const pages: Page[] = [];
  let start = 0;
  const push = (text: string, isQuestion: boolean) => {
    pages.push({ text, start, question: isQuestion });
    start += text.length;
  };
  for (const paragraph of paragraphs) {
    let page = '';
    for (const sentence of paragraph.split(/(?<=[.!?…»])\s+/)) {
      if (page && page.length + sentence.length + 1 > PAGE_CHARS) {
        push(page, false);
        page = '';
      }
      page = page ? `${page} ${sentence}` : sentence;
    }
    if (page) push(page, false);
  }
  if (question) push(question, true);
  return pages;
}

// What the story characters and the narrator say, as in a visual novel: a text box along the bottom of the screen
// where the words are written as their voice says them. Nothing can be skipped: the answers only show up once
// everything has been said. It is a dialog for the game (the avatar stands still, the items wait) but it does not
// cover the canvas, so the camera can still be turned to look around. No backdrop blur: blurring a live 3D canvas
// every frame is expensive on phones.
export function ParchmentDialog({ title, subtitle, paragraphs, question, voice, tone = 'pergamino', onDone, onClose, children }: ParchmentDialogProps) {
  const voiceKey = voice?.join('|') ?? '';
  // By its content: the dialogs build their paragraphs anew on every render.
  const textKey = JSON.stringify([paragraphs, question ?? '']);
  const pages = useMemo(() => {
    const [text, asked] = JSON.parse(textKey) as [string[], string];
    return paginate(text, asked || undefined);
  }, [textKey]);
  const total = pages.reduce((sum, page) => sum + page.text.length, 0);
  // What is being said: how many characters of it are written and whether it is over.
  const said = `${voiceKey}|${textKey}`;
  const [state, setState] = useState({ said, typed: 0, done: false });
  const { typed, done } = state.said === said ? state : { typed: 0, done: false };
  // Read when the time comes: a new function on every render must not start the voice again.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const clips = voiceKey ? voiceKey.split('|') : [];
    const startedAt = performance.now();
    let lengths: number[] | null = null;
    let heard = false;
    let shown = 0;
    let written = -1;
    let frame = 0;
    let pause: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    void voiceDurations(clips).then((seconds) => {
      lengths = seconds;
    });
    const { stop, clock } = followVoice(clips);

    const tick = () => {
      const now = clock();
      const elapsed = (performance.now() - startedAt) / 1000;
      if (now && now.time > 0) heard = true;
      if (heard) {
        // The words follow the voice: as far into the text as the voice is into its clips.
        const all = lengths?.reduce((sum, seconds) => sum + seconds, 0) ?? 0;
        if (!now) shown = 1;
        else if (lengths && all > 0) {
          const before = lengths.slice(0, now.clip).reduce((sum, seconds) => sum + seconds, 0);
          shown = Math.max(shown, (before + now.time) / all);
        }
      } else if (elapsed > VOICE_WAIT) {
        shown = Math.max(shown, ((elapsed - VOICE_WAIT) * READING_CHARS_PER_SECOND) / Math.max(1, total));
      }
      const over = heard ? !now : shown >= 1;
      const count = over ? total : Math.min(total, Math.floor(shown * total));
      if (count !== written) {
        written = count;
        setState({ said, typed: count, done: false });
      }
      if (!over) {
        frame = requestAnimationFrame(tick);
        return;
      }
      pause = setTimeout(() => {
        if (!alive) return;
        setState({ said, typed: total, done: true });
        onDoneRef.current?.();
      }, PAUSE_SECONDS * 1000);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      clearTimeout(pause);
      stop();
    };
  }, [said, voiceKey, total]);

  // Once everything has been said, Escape (or Enter) closes it as the × does.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (!done) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.key === 'Escape' || event.key === 'Enter') && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done]);

  // The page being written: a page that is complete stays until the next word comes.
  const index = Math.max(0, pages.findLastIndex((each) => each.start < typed));
  const page = pages[index] ?? { text: '', start: 0, question: false };
  const written = Math.max(0, Math.min(page.text.length, typed - page.start));
  const style = TONES[tone];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 sm:px-4 pb-[max(10px,env(safe-area-inset-bottom,10px))] pointer-events-none select-none">
      <div
        role="dialog"
        aria-label={title}
        style={{ backgroundImage: `url(${PERGAMINO})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
        className="relative pointer-events-auto w-full max-w-5xl text-[#3e2723] drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)] px-[7%] pt-6 pb-5 sm:pt-8 sm:pb-7 font-serif"
      >
        {/* Shown once everything has been said, in the top corner of the paper by the right roller: it closes the scroll
            and the game goes on. */}
        {done && onClose && (
          <button
            type="button"
            onClick={() => {
              playSfx('ui_boton', { volume: 0.6 });
              onClose();
            }}
            aria-label="Cerrar y seguir"
            title="Cerrar y seguir (Esc)"
            className="absolute top-[17%] right-[5.2%] w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 border-[#5c3a21] text-[#5c3a21] bg-[#f4e4bc]/70 hover:bg-[#5c3a21] hover:text-[#f4e4bc] active:scale-95 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
        <div className="flex items-center justify-between gap-3 mb-1 min-h-7 sm:min-h-8">
          <p className="min-w-0 truncate">
            <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${style.name}`}>{title}</span>
            {subtitle && <span className="ml-2 text-[11px] sm:text-xs italic opacity-70">{subtitle}</span>}
          </p>
          <div className="flex shrink-0 items-center gap-2.5">
            {pages.length > 1 && (
              <span className="text-[10px] sm:text-[11px] font-mono opacity-60">
                {index + 1}/{pages.length}
              </span>
            )}
          </div>
        </div>
        {/* The words still to come are there, unseen: the box keeps its size and no word jumps to the next line. */}
        <p className={`min-h-[3.9em] text-sm sm:text-lg leading-snug ${page.question ? 'font-bold' : ''}`}>
          <span>{page.text.slice(0, written)}</span>
          <span className="opacity-0" aria-hidden="true">
            {page.text.slice(written)}
          </span>
        </p>
        {done && children && <div className="mt-2 pt-2 border-t border-current/15">{children}</div>}
      </div>
    </div>
  );
}

type ParchmentButtonProps = { onClick: () => void; tone?: 'accept' | 'decline'; children: ReactNode };

export function ParchmentButton({ onClick, tone = 'accept', children }: ParchmentButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        playSfx('ui_boton', { volume: 0.6 });
        onClick();
      }}
      className={`px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold cursor-pointer rounded-lg bg-[#5c3a21] border-2 border-[#3e2723] shadow-md hover:scale-105 active:scale-95 transition-transform ${
        tone === 'accept' ? 'text-[#f4d03f]' : 'text-[#ff6b6b]'
      }`}
    >
      {children}
    </button>
  );
}
