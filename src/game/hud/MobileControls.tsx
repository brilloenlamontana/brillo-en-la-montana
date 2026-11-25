import type { CSSProperties } from 'react';
import { Joystick, VirtualButton } from 'ecctrl/input';
import { useInteractionStore } from '@/game/engine/interaction/interactionStore';
import { useUIStore } from '@/store/uiStore';

// The game's colours, see-through so the world shows under the thumbs: parchment, wood and gold.
const WOOD = '92, 58, 33';
const PARCHMENT = '244, 228, 188';
const GOLD = '244, 208, 63';

const FIXED: CSSProperties = { position: 'fixed', zIndex: 25, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', borderRadius: '50%' };
const CAP: CSSProperties = {
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  letterSpacing: '0.06em',
};

// Touch controls (phones and tablets, played lying on their side): the joystick under the left thumb; under the right
// one, RUN at the bottom (tapped once it stays on and reads WALK; tapped again it walks) and JUMP over it, smaller and fainter. When there is something to do with
// what is in reach (what the E key does: eat a fruit, talk, pick up), a labelled button for it shows beside RUN, in the
// same place every time, so the thumb learns where it is (the objective shows at the top on a touch screen).
export function MobileControls({ show = true }: { show?: boolean }) {
  const offer = useInteractionStore((state) => state.offers[state.offers.length - 1]);
  // Nothing to tap behind a dialog, a cinematic or the open backpack.
  const running = useUIStore((state) => state.running);
  const busy = useUIStore((state) => state.dialog !== null || state.cinematic || state.backpackOpen);
  if (!show) return null;

  return (
    <div className="mobile-controls-layer pointer-events-none select-none" style={{ position: 'fixed', inset: 0, zIndex: 20, touchAction: 'none' }}>
      <div className="pointer-events-auto">
        <Joystick
          id="default"
          joystickMaxRadius={44}
          joystickWrapperStyle={{
            ...FIXED,
            borderRadius: 0,
            bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
            left: 'max(20px, env(safe-area-inset-left, 20px))',
            width: '140px',
            height: '140px',
          }}
          joystickBaseStyle={{
            width: '104px',
            height: '104px',
            background: `radial-gradient(circle, rgba(${PARCHMENT}, 0.16) 0%, rgba(${PARCHMENT}, 0.34) 100%)`,
            border: `2px solid rgba(${WOOD}, 0.6)`,
            boxShadow: `0 4px 14px rgba(42, 26, 18, 0.25), inset 0 0 10px rgba(${WOOD}, 0.18)`,
            borderRadius: '50%',
          }}
          joystickKnobStyle={{
            width: '50px',
            height: '50px',
            background: `radial-gradient(circle at 35% 35%, rgba(141, 110, 99, 0.92) 0%, rgba(${WOOD}, 0.92) 75%)`,
            border: `2px solid rgba(${GOLD}, 0.85)`,
            boxShadow: '0 3px 10px rgba(42, 26, 18, 0.45)',
            borderRadius: '50%',
          }}
        />
      </div>

      <div className="pointer-events-auto">
        {/* Tapped, not held: it stays on (sunk, and now offering to walk) until it is tapped again. */}
        <button
          type="button"
          aria-pressed={running}
          aria-label={running ? 'Caminar' : 'Correr'}
          onPointerDown={(event) => {
            event.preventDefault();
            useUIStore.getState().toggleRunning();
          }}
          style={{
            ...FIXED,
            bottom: 'max(18px, env(safe-area-inset-bottom, 18px))',
            right: 'max(24px, env(safe-area-inset-right, 24px))',
            width: '78px',
            height: '78px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          <span
            style={{
              ...CAP,
              width: '66px',
              height: '66px',
              background: running
                ? `radial-gradient(circle at 35% 35%, rgba(141, 110, 99, 0.95) 0%, rgba(${WOOD}, 0.95) 75%)`
                : `radial-gradient(circle at 35% 35%, rgba(248, 224, 138, 0.9) 0%, rgba(${GOLD}, 0.82) 70%)`,
              border: `2px solid rgba(${running ? GOLD : WOOD}, 0.9)`,
              boxShadow: running ? 'inset 0 3px 8px rgba(0, 0, 0, 0.55)' : '0 4px 12px rgba(42, 26, 18, 0.4)',
              transform: running ? 'scale(0.94)' : 'none',
              color: running ? `rgb(${GOLD})` : '#3e2723',
              fontSize: running ? '10px' : '11px',
              transition: 'transform 0.12s, box-shadow 0.12s',
            }}
          >
            {running ? 'CAMINAR' : 'CORRER'}
          </span>
        </button>

        <VirtualButton
          id="jump"
          label="SALTAR"
          buttonWrapperStyle={{
            ...FIXED,
            bottom: 'max(104px, calc(env(safe-area-inset-bottom, 18px) + 86px))',
            right: 'max(34px, env(safe-area-inset-right, 34px))',
            width: '58px',
            height: '58px',
          }}
          buttonCapStyle={{
            ...CAP,
            width: '50px',
            height: '50px',
            background: `rgba(${PARCHMENT}, 0.3)`,
            border: `2px solid rgba(${WOOD}, 0.5)`,
            boxShadow: '0 2px 8px rgba(42, 26, 18, 0.2)',
            color: 'rgba(62, 39, 35, 0.85)',
            fontSize: '9px',
          }}
        />
      </div>

      {offer && !busy && (
        <button
          type="button"
          onClick={offer.activate}
          aria-label={offer.action}
          className="pointer-events-auto fixed z-[26] bottom-[max(22px,env(safe-area-inset-bottom,22px))] right-[max(116px,calc(env(safe-area-inset-right,24px)+92px))] max-w-[42vw] flex items-center gap-2 rounded-full border-2 border-[#5c3a21] bg-[#f4e4bc]/95 pl-2 pr-4 py-1.5 text-left text-[#3e2723] shadow-[0_4px_14px_rgba(42,26,18,0.45)] active:scale-95 transition-transform"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5c3a21] text-[#f4d03f]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5V4.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.6a6 6 0 0 1-4.6-2.2L3.6 15a1.6 1.6 0 0 1 2.4-2.1L9 15" />
            </svg>
          </span>
          <span className="min-w-0 font-serif text-sm font-bold leading-tight first-letter:uppercase line-clamp-2">{offer.action}</span>
        </button>
      )}
    </div>
  );
}
