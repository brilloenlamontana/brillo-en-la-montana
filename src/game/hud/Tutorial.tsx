import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { playVoice } from '@/game/engine/audio/audio';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';

// The tutorial of the controls: four short steps shown at the bottom of the screen while the game goes on, each one
// told aloud by the narrator (clips 06_narrador_01..08: the first four for keyboard and mouse, the rest for a touch
// screen). They are learned by doing (walk, look around, run, interact): each one is ticked off when the player
// actually does it, once the narrator has finished telling it, and can also be passed with "Siguiente". After the last
// one is done the tutorial closes by itself. It starts by itself the first time the world opens
// (progress.tutorialVisto) and again whenever the player asks for it with the "?" button of the top bar
// (TutorialButton).

// Metres walked, pixels dragged over the world and seconds a tick stays before the next step comes.
const WALKED = 3;
const DRAGGED = 120;
const TICK_SECONDS = 0.9;
// The last step is done by talking, reading or picking up, by opening the map, or by having followed the light this
// far (m).
const FOLLOWED = 15;
// A step counts as told after this long (s) even if its voice could not be heard to the end (a notice spoke over it,
// or the clip is missing): the longest clip lasts 14 s.
const TOLD_SECONDS = 16;
// What is tapped or clicked to do what the last step teaches carries this attribute (the map, the button that talks,
// reads or picks up on a touch screen).
const TEACHES = '[data-tutorial-guia]';
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

// What each step says, with a keyboard and mouse and on a touch screen, and the narrator's clip that tells it (the
// same words: if a text changes here, its clip has to be recorded again; script in docs/Guion_Voces_Indicaciones.md).
const TEXT: Record<Step, { title: string; keyboard: ReactNode; touch: ReactNode; voice: { keyboard: string; touch: string } }> = {
  mover: {
    title: 'Camina',
    voice: { keyboard: '06_narrador_01', touch: '06_narrador_05' },
    keyboard: (
      <>
        Camina con <Tecla>W</Tecla>
        <Tecla>A</Tecla>
        <Tecla>S</Tecla>
        <Tecla>D</Tecla> o con las flechas del teclado.
      </>
    ),
    touch: <>Arrastra el círculo de la izquierda hacia donde quieras ir.</>,
  },
  // It never says "the world": a player took that for the small map of the corner. It names the middle of the screen.
  camara: {
    title: 'Mira a tu alrededor',
    voice: { keyboard: '06_narrador_02', touch: '06_narrador_06' },
    keyboard: (
      <>
        Mantén presionado el clic del mouse en el centro de la pantalla y arrastra hacia los lados. El cuadro de la esquina es el mapa: sobre él la cámara no gira.
      </>
    ),
    touch: <>Desliza un dedo por el centro de la pantalla, fuera de los botones y del mapa.</>,
  },
  correr: {
    title: 'Corre y salta',
    voice: { keyboard: '06_narrador_03', touch: '06_narrador_07' },
    keyboard: (
      <>
        Mantén <Tecla>Shift</Tecla> mientras caminas para correr. Con <Tecla>Espacio</Tecla> saltas.
      </>
    ),
    touch: (
      <>
        Toca <Boton>CORRER</Boton> una vez para correr; el botón cambia a <Boton>CAMINAR</Boton>: tócalo otra vez para volver a caminar. Con <Boton>SALTAR</Boton> saltas.
      </>
    ),
  },
  guia: {
    title: 'A dónde ir y qué hacer',
    voice: { keyboard: '06_narrador_04', touch: '06_narrador_08' },
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

// Calls `onDone` once the player does what the step teaches.
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
    if (step === 'guia') {
      // Something was talked to, read or picked up (E, or its button on a touch screen), the map was opened (M, or a
      // tap on it), or the light was followed for a while.
      const { position } = usePlayerStore.getState();
      let x = position.x, z = position.z, walked = 0;
      const timer = setInterval(() => {
        const moved = Math.hypot(position.x - x, position.z - z);
        x = position.x;
        z = position.z;
        if (moved < TELEPORT) walked += moved;
        if (walked >= FOLLOWED) onDone();
      }, 150);
      const key = (event: KeyboardEvent) => {
        if (!event.repeat && ['e', 'm'].includes(event.key.toLowerCase())) onDone();
      };
      const tap = (event: PointerEvent) => {
        if (event.target instanceof Element && event.target.closest(TEACHES)) onDone();
      };
      window.addEventListener('keydown', key);
      window.addEventListener('pointerdown', tap, true);
      return () => {
        clearInterval(timer);
        window.removeEventListener('keydown', key);
        window.removeEventListener('pointerdown', tap, true);
      };
    }
  }, [step, active, onDone]);
}

function TutorialCard({ touch }: { touch: boolean }) {
  // A narration, a cinematic, the backpack or the manual fills the screen: the tutorial waits behind it.
  const busy = useUIStore((state) => state.dialog !== null || state.cinematic || state.backpackOpen || state.manualOpen || state.introOpen);
  const talking = useUIStore((state) => state.dialog !== null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  // The step that the narrator has finished telling (see TOLD_SECONDS).
  const [told, setTold] = useState(-1);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const finish = useCallback(() => {
    useUIStore.getState().closeTutorial();
    if (!useProgressStore.getState().progress.tutorialVisto) void saveProgress({ tutorialVisto: true });
  }, []);
  const next = () => {
    setDone(false);
    if (last) finish();
    else setIndex(index + 1);
  };

  const markDone = useCallback(() => setDone(true), []);
  useStepDone(step, !done && !busy, markDone);

  // The narrator tells each step as it comes (and again when it comes back from behind a narration or the backpack).
  const clip = TEXT[step].voice[touch ? 'touch' : 'keyboard'];
  useEffect(() => {
    if (busy) return;
    const heard = () => setTold(index);
    const stop = playVoice([clip], heard);
    const timer = setTimeout(heard, TOLD_SECONDS * 1000);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [clip, index, busy]);

  // Done and told: the tick stays a moment, so it is seen, and the next step comes. After the last one the tutorial
  // closes by itself.
  const passed = done && told === index;
  useEffect(() => {
    if (!passed) return;
    const timer = setTimeout(() => {
      setDone(false);
      if (last) finish();
      else setIndex(index + 1);
    }, TICK_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [passed, last, index, finish]);

  // On the last step, talking to someone or reading something is doing what it teaches: the narration that opens
  // takes the screen and the tutorial is over.
  useEffect(() => {
    if (last && talking) finish();
  }, [last, talking, finish]);

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
        {last && (
          <p className="mt-1 text-[10px] sm:text-xs leading-snug italic text-[#6d4c33]">
            Tu objetivo aparece arriba por unos segundos; para verlo otra vez, usa el botón de la diana de la barra de arriba. Esta ayuda vuelve con el botón «?».
          </p>
        )}
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
