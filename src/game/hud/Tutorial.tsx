import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';

// The tutorial of the controls: four short steps shown at the bottom of the screen while the game goes on. The first
// three are learned by doing (walk, look around, run): each one is ticked off when the player actually does it, and
// can also be passed with "Siguiente". It starts by itself the first time the world opens (progress.tutorialVisto)
// and again whenever the player asks for it with the "?" button of the top bar (TutorialButton).

// Metres walked, pixels dragged over the world and seconds a tick stays before the next step comes.
const WALKED = 3;
const DRAGGED = 120;
const TICK_SECONDS = 0.9;
// A step between two readings longer than this (m) is a teleport, not walking.
const TELEPORT = 5;

const STEPS = ['mover', 'camara', 'correr', 'guia'] as const;
type Step = (typeof STEPS)[number];

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 mx-0.5 rounded-md bg-[#fbf3dc] border-2 border-[#5c3a21] text-[11px] font-bold font-sans shadow-[0_2px_0_#5c3a21] align-middle">
      {children}
    </kbd>
  );
}

const Boton = ({ children }: { children: ReactNode }) => <strong className="font-sans text-[0.92em] tracking-wide">{children}</strong>;

// What each step says, with a keyboard and mouse and on a touch screen.
const TEXT: Record<Step, { title: string; keyboard: ReactNode; touch: ReactNode }> = {
  mover: {
    title: 'Camina',
    keyboard: (
      <>
        Camina con <Tecla>W</Tecla>
        <Tecla>A</Tecla>
        <Tecla>S</Tecla>
        <Tecla>D</Tecla> o con las flechas del teclado.
      </>
    ),
    touch: <>Arrastra el círculo de la izquierda hacia donde quieras caminar.</>,
  },
  camara: {
    title: 'Mira alrededor',
    keyboard: <>Mantén presionado el clic del mouse sobre el mundo y arrastra para girar la cámara.</>,
    touch: <>Desliza un dedo por la pantalla, fuera de los botones, para girar la cámara.</>,
  },
  correr: {
    title: 'Corre y salta',
    keyboard: (
      <>
        Mantén <Tecla>Shift</Tecla> mientras caminas para correr. Con <Tecla>Espacio</Tecla> saltas.
      </>
    ),
    touch: (
      <>
        Mantén <Boton>CORRER</Boton> mientras caminas. Con <Boton>SALTAR</Boton> saltas.
      </>
    ),
  },
  guia: {
    title: 'A dónde ir y qué hacer',
    keyboard: (
      <>
        La columna de luz dorada marca a dónde ir. Junto a una persona o un objeto, presiona <Tecla>E</Tecla> para hablar, leer o recoger. Con <Tecla>M</Tecla> abres el
        mapa.
      </>
    ),
    touch: (
      <>
        La columna de luz dorada marca a dónde ir. Junto a una persona o un objeto aparece un botón al lado de <Boton>CORRER</Boton>: tócalo para hablar, leer o recoger.
        Toca el mapa pequeño para verlo completo.
      </>
    ),
  },
};

// Calls `onDone` once the player does what the step teaches. The last step is only read.
function useStepDone(step: Step, active: boolean, onDone: () => void) {
  useEffect(() => {
    if (!active) return;
    if (step === 'mover') {
      const { position } = usePlayerStore.getState();
      let x = position.x, z = position.z, walked = 0;
      const timer = setInterval(() => {
        const moved = Math.hypot(position.x - x, position.z - z);
        x = position.x;
        z = position.z;
        if (moved < TELEPORT) walked += moved;
        if (walked >= WALKED) onDone();
      }, 150);
      return () => clearInterval(timer);
    }
    if (step === 'camara') {
      // Dragging over the world (the canvas) is what turns the camera; the joystick and the buttons are not the canvas.
      let from: { x: number; y: number } | null = null;
      let dragged = 0;
      const down = (event: PointerEvent) => {
        from = event.target instanceof HTMLCanvasElement ? { x: event.clientX, y: event.clientY } : null;
      };
      const move = (event: PointerEvent) => {
        if (!from) return;
        dragged += Math.abs(event.clientX - from.x) + Math.abs(event.clientY - from.y);
        from = { x: event.clientX, y: event.clientY };
        if (dragged >= DRAGGED) onDone();
      };
      const up = () => {
        from = null;
      };
      window.addEventListener('pointerdown', down, true);
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
      return () => {
        window.removeEventListener('pointerdown', down, true);
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
      };
    }
    if (step === 'correr') {
      const timer = setInterval(() => {
        if (usePlayerStore.getState().action === 'Running') onDone();
      }, 150);
      const key = (event: KeyboardEvent) => {
        if (event.code === 'Space') onDone();
      };
      window.addEventListener('keydown', key);
      return () => {
        clearInterval(timer);
        window.removeEventListener('keydown', key);
      };
    }
  }, [step, active, onDone]);
}

function TutorialCard({ touch }: { touch: boolean }) {
  // A narration, a cinematic, the backpack or the manual fills the screen: the tutorial waits behind it.
  const busy = useUIStore((state) => state.dialog !== null || state.cinematic || state.backpackOpen || state.manualOpen);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const finish = () => {
    useUIStore.getState().closeTutorial();
    if (!useProgressStore.getState().progress.tutorialVisto) void saveProgress({ tutorialVisto: true });
  };
  const next = () => {
    setDone(false);
    if (last) finish();
    else setIndex(index + 1);
  };

  const markDone = useCallback(() => setDone(true), []);
  useStepDone(step, !done && !busy, markDone);

  // Done: the tick stays a moment, so it is seen, and the next step comes.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      setDone(false);
      setIndex((current) => Math.min(current + 1, STEPS.length - 1));
    }, TICK_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [done]);

  if (busy) return null;

  // A focused button would be pressed again by the space bar, which is the jump key: it lets go of the focus.
  const press = (action: () => void) => (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    action();
  };
  const text = TEXT[step];

  return (
    <section
      aria-label="Tutorial de controles"
      className={`absolute bottom-[max(12px,env(safe-area-inset-bottom,12px))] left-1/2 -translate-x-1/2 z-30 w-max ${
        touch ? 'max-w-[calc(100vw-24rem)]' : 'max-w-[min(32rem,calc(100vw-26rem))]'
      } min-w-[15rem] bg-[#f4e4bc]/97 border-2 border-[#5c3a21] rounded-xl px-3 py-2 sm:px-4 sm:py-3 shadow-[0_6px_16px_rgba(62,39,35,0.45)] font-serif text-[#3e2723] select-none`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8a5a2b]">
          Cómo se juega · {index + 1} de {STEPS.length}
        </h2>
        <button type="button" onClick={press(finish)} className="text-[11px] sm:text-xs font-sans font-semibold text-[#5c3a21] underline underline-offset-2 cursor-pointer">
          Saltar
        </button>
      </div>
      {/* The key makes each step come in with a short fade, so the change is noticed. */}
      <div key={step} className="objective-in mt-1" role="status" aria-live="polite">
        <p className="text-sm sm:text-base font-bold leading-tight">
          {text.title}
          {done && <span className="ml-2 font-sans text-[#3d7a36]">✓ ¡Bien!</span>}
        </p>
        <p className="mt-0.5 text-[11px] sm:text-sm leading-snug">{touch ? text.touch : text.keyboard}</p>
        {last && <p className="mt-1 text-[10px] sm:text-xs leading-snug italic text-[#6d4c33]">Al cerrar esta ayuda, aquí abajo verás siempre tu objetivo. Si la necesitas otra vez, toca el botón «?» de arriba.</p>}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((id, position) => (
            <span key={id} className={`h-2 w-2 rounded-full border border-[#5c3a21] ${position < index || (position === index && done) ? 'bg-[#3d7a36]' : position === index ? 'bg-[#f4d03f]' : 'bg-transparent'}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={press(next)}
          className="rounded-lg border-2 border-[#3e2723] bg-[#5c3a21] px-3 py-1 text-[11px] sm:text-xs font-sans font-bold text-[#f4d03f] cursor-pointer active:scale-95 transition-transform"
        >
          {last ? 'Entendido' : 'Siguiente'}
        </button>
      </div>
    </section>
  );
}

// `touch`: the steps are told for the joystick and the buttons instead of the keyboard and the mouse.
export function Tutorial({ touch = false }: { touch?: boolean }) {
  const ready = useWorldStore((state) => state.ready);
  const seen = useProgressStore((state) => state.progress.tutorialVisto);
  const open = useUIStore((state) => state.tutorialOpen);
  const run = useUIStore((state) => state.tutorialRun);

  // The first time the world opens it starts by itself.
  useEffect(() => {
    if (ready && !seen) useUIStore.getState().openTutorial();
  }, [ready, seen]);

  if (!ready || !open) return null;
  return <TutorialCard key={run} touch={touch} />;
}

// The "?" of the top bar: shows the tutorial of the controls again, from its first step, at any moment.
export function TutorialButton() {
  const label = 'Cómo se juega: ver el tutorial de controles';
  const open = () => {
    const ui = useUIStore.getState();
    ui.setBackpackOpen(false);
    ui.openTutorial();
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
        className="flex items-center justify-center w-8 h-8 rounded-full text-madera-700 font-serif text-lg font-bold leading-none hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-madera-600"
      >
        ?
      </button>
      <div className="w-px h-5 bg-papel-300" />
    </>
  );
}
