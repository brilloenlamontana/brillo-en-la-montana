import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { canTurnScreen, turnScreen } from './useImmersiveOnTouch';

const PORTRAIT = '(orientation: portrait)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PORTRAIT);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const isPortrait = () => window.matchMedia(PORTRAIT).matches;

type Phone = 'iphone' | 'android';

// Which phone this is, to show its own steps first (an iPad says it is a Mac, but it has a touch screen).
function thisPhone(): Phone {
  const agent = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1) ? 'iphone' : 'android';
}

const GOLD = '#f4d03f';

// The button of each phone that locks the rotation, as it looks in its quick settings: a padlock inside a turning
// arrow on iPhone; a tilted phone between two arrows on Android.
function LockIcon({ phone }: { phone: Phone }) {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#3e2723" stroke="#8d6e63" />
      {phone === 'iphone' ? (
        <>
          <path d="M36 17a13.5 13.5 0 1 0 1.5 9" />
          <path d="M37.5 10v7.5H30" />
          <rect x="18.5" y="22.5" width="11" height="8.5" rx="2" fill={GOLD} />
          <path d="M20.8 22.5v-2.6a3.2 3.2 0 0 1 6.4 0v2.6" />
        </>
      ) : (
        <>
          <rect x="18" y="13" width="12" height="22" rx="2.5" transform="rotate(-45 24 24)" />
          <path d="M31 9.5a15 15 0 0 1 7.5 9" />
          <path d="M38.8 13.2l-.3 5.3-5-1.6" />
          <path d="M17 38.5a15 15 0 0 1-7.5-9" />
          <path d="M9.2 34.8l.3-5.3 5 1.6" />
        </>
      )}
    </svg>
  );
}

// How to take the rotation lock off, phone by phone.
const STEPS: Record<Phone, { name: string; steps: ReactNode[] }> = {
  iphone: {
    name: 'iPhone',
    steps: [
      <>
        Desliza el dedo <strong>hacia abajo desde la esquina de arriba a la derecha</strong> de la pantalla. Si tu iPhone tiene un botón redondo abajo, desliza hacia arriba
        desde el borde de abajo.
      </>,
      <>
        Toca el botón del <strong>candado con una flecha alrededor</strong>, para que quede apagado.
      </>,
      <>Vuelve aquí y gira el celular.</>,
    ],
  },
  android: {
    name: 'Android',
    steps: [
      <>
        Desliza el dedo <strong>hacia abajo desde el borde de arriba</strong> de la pantalla, dos veces.
      </>,
      <>
        Toca el botón <strong>«Girar automáticamente»</strong> para encenderlo. En algunos celulares se llama «Rotación automática» o dice «Vertical».
      </>,
      <>Vuelve aquí y gira el celular.</>,
    ],
  },
};

// On a phone or tablet the game is played with the screen lying on its side. While the device is held upright this
// covers the world and asks the player to turn it. Where the browser allows it (Android Chrome), a button turns the
// screen for them, even with the rotation locked; where it does not (iPhone), it shows, step by step, how to take the
// lock off: a player who has it on would otherwise turn the phone and see nothing change.
export function LandscapeOnly() {
  const mobile = useIsMobile();
  const portrait = useSyncExternalStore(subscribe, isPortrait, () => false);
  const [phone, setPhone] = useState<Phone>(thisPhone);
  const [refused, setRefused] = useState(false);

  if (!mobile || !portrait) return null;

  const { steps } = STEPS[phone];
  const offerTurn = canTurnScreen() && !refused;

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-[#2a1a12] text-[#f4e4bc] select-none"
      role="alertdialog"
      aria-modal="true"
      aria-label="Gira tu celular para jugar"
    >
      <div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center gap-4 px-6 py-8 text-center">
        <svg viewBox="0 0 96 96" className="h-24 w-24 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* The phone upright (faint), the phone on its side (gold) and the turn between them. */}
          <rect x="14" y="10" width="30" height="54" rx="5" className="text-[#8d6e63]" stroke="currentColor" />
          <rect x="34" y="56" width="54" height="30" rx="5" stroke={GOLD} fill="#3e2723" />
          <path d="M54 16c14 2 24 12 26 26" stroke={GOLD} />
          <path d="M72 38l8 5 5-9" stroke={GOLD} />
        </svg>
        <h2 className="font-serif text-2xl font-bold">Gira tu celular</h2>
        <p className="text-sm text-[#e8d09c]">Brillo en la montaña se juega con el celular acostado.</p>

        {offerTurn && (
          <button
            type="button"
            onClick={() => void turnScreen().catch(() => setRefused(true))}
            className="rounded-xl border-2 border-[#3e2723] bg-[#f4d03f] px-5 py-2.5 font-sans text-base font-bold text-[#3e2723] shadow-lg cursor-pointer active:scale-95 transition-transform"
          >
            Girar la pantalla por mí
          </button>
        )}

        <section className="w-full rounded-xl border-2 border-[#5c3a21] bg-[#3e2723]/60 p-4 text-left">
          <h3 className="font-serif text-base font-bold">¿Lo giraste y sigue igual?</h3>
          <p className="mt-0.5 text-sm text-[#e8d09c]">Tu celular tiene bloqueado el giro de la pantalla. Se quita así:</p>
          <div className="mt-3 flex gap-2" role="tablist" aria-label="Tipo de celular">
            {(Object.keys(STEPS) as Phone[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === phone}
                onClick={() => setPhone(id)}
                className={`flex-1 rounded-lg border-2 px-3 py-1.5 font-sans text-sm font-bold cursor-pointer ${
                  id === phone ? 'border-[#f4d03f] bg-[#f4d03f] text-[#3e2723]' : 'border-[#8d6e63] text-[#e8d09c]'
                }`}
              >
                {STEPS[id].name}
              </button>
            ))}
          </div>
          <ol className="mt-3 flex flex-col gap-2.5">
            {steps.map((step, index) => (
              <li key={index} className="flex items-center gap-3 text-sm leading-snug">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4d03f] font-sans text-sm font-bold text-[#3e2723]">{index + 1}</span>
                <span className="flex-1">{step}</span>
                {index === 1 && <LockIcon phone={phone} />}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
