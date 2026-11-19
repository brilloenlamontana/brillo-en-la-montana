import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { playSfx } from '@/game/engine/audio/audio';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { LANDMARKS, MAP_PICTURE, MAP_STAGES, mapStage, nextLandmark, onMapPicture, REGION_NAMES, uncoveredAreas, type LandmarkKind } from '@/game/world/landmarks';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';

// The map picture: its size in metres and its shape (width / height).
const MAP_METERS = MAP_PICTURE.x[1] - MAP_PICTURE.x[0];
const ASPECT = MAP_METERS / (MAP_PICTURE.z[1] - MAP_PICTURE.z[0]);
// The small map shows this many metres across, around the avatar.
const NEAR_METERS = 85;
const ZOOM = MAP_METERS / NEAR_METERS;
// The avatar's arrow turns to where it walks once it has moved this far (m): standing still it keeps its heading.
const TURN_AFTER = 0.05;
// The panels of the HUD (as the health bar): parchment, a wood border, rounded corners.
const PANEL = 'bg-[#f4e4bc]/95 border-2 border-[#5c3a21] rounded-xl sm:rounded-2xl shadow-[0_4px_12px_rgba(62,39,35,0.35)]';

// How each kind of place is drawn: its colour and what the legend calls it.
const KINDS: Record<LandmarkKind, { dot: string; label: string }> = {
  casa: { dot: 'bg-[#8a5a2b]', label: 'Quien te ayuda' },
  desafio: { dot: 'bg-[#a23b2a]', label: 'Desafío' },
  meta: { dot: 'bg-[#4f6b22]', label: 'Meta' },
};

// The part of the map the story has not reached yet: nothing of it shows through.
const FOG = '#17100a';
// How soft the edge of the uncovered part is (m).
const FOG_EDGE = 5;

const percent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;

// The avatar on a map: an arrow pointing where it walks.
function Arrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`${className} drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]`} aria-hidden="true">
      <path d="M8 1.2 13.4 14 8 11.2 2.6 14Z" fill="#c8102e" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

// The dark over the map (it fills the same box as the picture): everything but what the story has uncovered so far
// (see mapStage) is hidden under it, with a soft edge. Once the chalice is back the whole map shows.
function Fog({ stage }: { stage: number }) {
  const id = useId();
  if (stage >= MAP_STAGES) return null;
  const { x, z } = MAP_PICTURE;
  const width = x[1] - x[0];
  const height = z[1] - z[0];
  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`${x[0]} ${z[0]} ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={`${id}-edge`} filterUnits="userSpaceOnUse" x={x[0]} y={z[0]} width={width} height={height}>
          <feGaussianBlur stdDeviation={FOG_EDGE} />
        </filter>
        <mask id={`${id}-fog`} maskUnits="userSpaceOnUse" x={x[0]} y={z[0]} width={width} height={height}>
          <rect x={x[0]} y={z[0]} width={width} height={height} fill="#fff" />
          <g filter={`url(#${id}-edge)`} fill="#000" stroke="#000" strokeLinejoin="round" strokeLinecap="round">
            {uncoveredAreas(stage).map((area, i) =>
              area.shape === 'circle' ? (
                <ellipse key={i} cx={area.x} cy={area.z} rx={area.rx} ry={area.rz} stroke="none" />
              ) : area.shape === 'road' ? (
                <line key={i} x1={area.from[0]} y1={area.from[1]} x2={area.to[0]} y2={area.to[1]} strokeWidth={area.margin * 2} />
              ) : (
                <polygon key={i} points={area.points.map(([px, pz]) => `${px},${pz}`).join(' ')} strokeWidth={area.margin * 2} />
              ),
            )}
          </g>
        </mask>
      </defs>
      <rect x={x[0]} y={z[0]} width={width} height={height} fill={FOG} mask={`url(#${id}-fog)`} />
    </svg>
  );
}

// The places the story has uncovered so far, as dots over the map picture (they fill the same box as the picture);
// `names` writes what each one is called. Where the story sends the player next pulses in gold.
function Places({ next, names, stage }: { next: string | null; names: boolean; stage: number }) {
  return (
    <>
      {LANDMARKS.filter((landmark) => landmark.stage <= stage).map((landmark) => {
        const at = onMapPicture(landmark.x, landmark.z);
        const isNext = landmark.id === next;
        // The name hangs under the dot, turned inward near the sides of the map so it is never cut off.
        const side = at.left > 0.72 ? 'right-0 translate-x-2' : at.left < 0.28 ? 'left-0 -translate-x-2' : 'left-1/2 -translate-x-1/2';
        return (
          <span
            key={landmark.id}
            // With names, the dot answers the mouse (and a tap or the Tab key): its name shows only then.
            tabIndex={names ? 0 : undefined}
            aria-label={names ? `${landmark.name} (${KINDS[landmark.kind].label})` : undefined}
            className={`group absolute outline-none ${names ? 'z-0 hover:z-10 focus:z-10' : ''}`}
            style={{ left: percent(at.left), top: percent(at.top) }}
          >
            {isNext && <span className="absolute -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[#f4d03f]/70 animate-ping pointer-events-none" />}
            {/* A generous area around the dot, easy to point at. */}
            {names && <span className="absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full cursor-help" />}
            <span
              className={`absolute -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-[#2b1a0e] pointer-events-none transition-transform ${KINDS[landmark.kind].dot} ${
                isNext ? 'ring-2 ring-[#f4d03f]' : ''
              } ${names ? 'group-hover:scale-150 group-focus:scale-150' : ''}`}
            />
            {names && (
              <span
                role="tooltip"
                className={`absolute top-3 ${side} whitespace-nowrap rounded-md border border-[#5c3a21] px-1.5 py-0.5 text-[11px] sm:text-xs font-serif font-bold leading-tight shadow-md pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 ${
                  isNext ? 'bg-[#5c3a21] text-[#f4d03f]' : 'bg-[#f4e4bc] text-[#3e2723]'
                }`}
              >
                {landmark.name}
                {isNext && ' · tu siguiente destino'}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}

// The map of the journey. It starts dark and the story uncovers it step by step (Fog, mapStage): the player only sees
// the parts they have been sent to. At the bottom left, a small round-cornered panel like the rest of the HUD shows what is
// around the avatar: the map slides under an arrow that stays in the middle and turns to where the avatar walks, and
// a gold pointer on its edge tells which way the next place of the story is when it is out of sight. A click (or the M
// key) opens the whole map over the screen, with the name of every place, a legend and where the avatar is; its ×, a
// click outside it, M or Escape close it. The small map steps aside while a narration, a cinematic or the backpack
// fills the screen. With the touch controls on, the joystick has that corner and the map goes under the health bar.
export function Minimap({ touch = false }: { touch?: boolean }) {
  const ready = useWorldStore((state) => state.ready);
  const busy = useUIStore((state) => state.dialog !== null || state.cinematic || state.backpackOpen);
  const region = useZoneStore((state) => state.region);
  const next = useProgressStore((state) => nextLandmark(state.progress));
  const stage = useProgressStore((state) => mapStage(state.progress));
  const [open, setOpen] = useState(false);
  const ground = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLDivElement>(null);
  const pointer = useRef<HTMLDivElement>(null);
  const whole = useRef<HTMLDivElement>(null);
  const shown = ready && !busy;
  const wholeOpen = open && shown;

  const toggle = (value: boolean) => {
    playSfx('ui_boton', { volume: 0.5 });
    setOpen(value);
  };

  // M opens and closes the whole map (not while typing); Escape closes it.
  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (event.key === 'm' || event.key === 'M') setOpen((value) => !value);
      else if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown]);

  // Both maps follow the avatar every frame without re-rendering.
  useEffect(() => {
    if (!shown) return;
    const target = LANDMARKS.find((landmark) => landmark.id === next) ?? null;
    let frame = 0;
    let heading = 0;
    const last = { x: NaN, z: NaN };
    const tick = () => {
      const { x, z } = usePlayerStore.getState().position;
      const dx = x - last.x;
      const dz = z - last.z;
      if (Number.isNaN(last.x)) {
        last.x = x;
        last.z = z;
      } else if (Math.hypot(dx, dz) > TURN_AFTER) {
        // Up on the map is north (game -z).
        heading = (Math.atan2(dx, -dz) * 180) / Math.PI;
        last.x = x;
        last.z = z;
      }
      const at = onMapPicture(x, z);
      const turn = `rotate(${heading.toFixed(1)}deg)`;
      // The small map: the ground slides so that the avatar's spot is in the middle of the panel.
      if (ground.current) ground.current.style.transform = `translate(${(-at.left * 100).toFixed(3)}%, ${(-at.top * 100).toFixed(3)}%)`;
      if (arrow.current) arrow.current.style.transform = `translate(-50%, -50%) ${turn}`;
      // The next place, when it is beyond the edge of the small map: a pointer on that side.
      if (pointer.current) {
        const tx = target ? target.x - x : 0;
        const tz = target ? target.z - z : 0;
        const far = target !== null && Math.max(Math.abs(tx), Math.abs(tz) * ASPECT) > NEAR_METERS * 0.46;
        pointer.current.style.opacity = far ? '1' : '0';
        if (far) {
          const angle = Math.atan2(tx, -tz);
          pointer.current.style.left = `${(50 + Math.sin(angle) * 41).toFixed(2)}%`;
          pointer.current.style.top = `${(50 - Math.cos(angle) * 41).toFixed(2)}%`;
          pointer.current.style.transform = `translate(-50%, -50%) rotate(${((angle * 180) / Math.PI).toFixed(1)}deg)`;
        }
      }
      // The whole map: the arrow is where the avatar is.
      if (whole.current) {
        whole.current.style.left = percent(at.left);
        whole.current.style.top = percent(at.top);
        whole.current.style.transform = `translate(-50%, -50%) ${turn}`;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [shown, next, wholeOpen]);

  if (!shown) return null;

  // On touch it goes under the health bar and the forest's hunger bar (HambreBar), which share the top left corner.
  const place = touch
    ? 'top-[calc(max(12px,env(safe-area-inset-top,12px))+5.75rem)] left-[max(12px,env(safe-area-inset-left,12px))]'
    : 'bottom-[max(12px,env(safe-area-inset-bottom,12px))] left-[max(12px,env(safe-area-inset-left,12px))]';

  return (
    <>
      <div className={`absolute ${place} z-20 flex flex-col items-start gap-1 select-none`}>
        <button
          type="button"
          onClick={() => toggle(true)}
          aria-label="Abrir el mapa completo"
          title="Abrir el mapa completo (M)"
          className={`relative ${touch ? 'w-[4.5rem]' : 'w-36 sm:w-44'} aspect-square overflow-hidden ${PANEL} cursor-pointer hover:brightness-105 active:scale-[0.98] transition`}
        >
          {/* The ground: the whole picture, much bigger than the panel, hung from the panel's middle. */}
          <div ref={ground} className="absolute left-1/2 top-1/2 will-change-transform" style={{ width: percent(ZOOM), aspectRatio: ASPECT }}>
            <img src={MAP_PICTURE.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
            <Fog stage={stage} />
            <Places next={next} names={false} stage={stage} />
          </div>
          <div ref={pointer} className="absolute h-3.5 w-3.5 transition-opacity duration-200" style={{ opacity: 0 }}>
            <svg viewBox="0 0 16 16" className="h-full w-full drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]" aria-hidden="true">
              <path d="M8 1.5 14.5 12.5H1.5Z" fill="#f4d03f" stroke="#5c3a21" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
          <div ref={arrow} className="absolute left-1/2 top-1/2 h-5 w-5">
            <Arrow className="h-full w-full" />
          </div>
        </button>
      </div>

      {wholeOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2b1a0e]/55 select-none"
            onClick={() => toggle(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Mapa del viaje"
          >
            {/* Phones lying on their side: the title and legend sit at the left and the map takes the height of the screen. */}
            <div className={`relative flex max-h-full flex-col landscape:flex-row gap-2 landscape:gap-3 p-3 sm:p-4 ${PANEL}`} onClick={(event) => event.stopPropagation()}>
              <div className="flex min-w-0 flex-col gap-2 landscape:w-44 landscape:shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-serif text-base sm:text-lg font-bold leading-tight text-[#3e2723]">Mapa del viaje</h2>
                  <p className="truncate font-serif text-[11px] sm:text-xs text-[#5c3a21]">Estás en: {REGION_NAMES[region]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(false)}
                  aria-label="Cerrar el mapa"
                  title="Cerrar el mapa (Esc)"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#5c3a21] bg-[#f4e4bc] text-[#5c3a21] hover:bg-[#5c3a21] hover:text-[#f4e4bc] active:scale-95 transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <p className="flex flex-wrap landscape:flex-col gap-x-3 gap-y-0.5 font-serif text-[10px] sm:text-xs text-[#3e2723]">
                <span className="inline-flex items-center gap-1">
                  <Arrow className="h-3 w-3" />
                  Tú
                </span>
                {(Object.keys(KINDS) as LandmarkKind[]).map((kind) => (
                  <span key={kind} className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full border border-[#2b1a0e] ${KINDS[kind].dot}`} />
                    {KINDS[kind].label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#f4d03f] ring-1 ring-[#5c3a21]" />
                  Tu siguiente destino
                </span>
              </p>
              </div>
              <div
                className="map-frame relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-[#5c3a21]"
                style={{ aspectRatio: ASPECT, '--map-aspect': ASPECT } as CSSProperties}
              >
                <img src={MAP_PICTURE.url} alt="El mundo visto desde arriba" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                <Fog stage={stage} />
                <Places next={next} names stage={stage} />
                <div ref={whole} className="absolute h-5 w-5">
                  <Arrow className="h-full w-full" />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
