import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CharacterThumb } from '@/components/CharacterThumb';
import { CHARACTERS } from '@/data/characters';
import { isNicknameTaken, saveProfile } from '@/services/userService';
import { useAuthStore, type UserData } from '@/store/authStore';

// three.js only loads when the profile opens (the login and selection pages do not need it otherwise).
const CharacterPreview3D = lazy(() => import('@/components/CharacterPreview3D').then((m) => ({ default: m.CharacterPreview3D })));

type ProfileModalProps = { user: UserData; onClose: () => void };

// The nickname saves itself this long after the last key, once it is valid and free.
const AUTOSAVE_MS = 1000;
const MIN_LENGTH = 3;
const SAVED_SHOWN_MS = 2500;

type NickStatus =
  | { kind: 'idle' }
  | { kind: 'typing' }
  | { kind: 'checking' }
  | { kind: 'saved' }
  | { kind: 'taken'; name: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'error' };

function NickStatusLine({ status }: { status: NickStatus }) {
  const base = 'flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold';
  switch (status.kind) {
    case 'typing':
      return <span className={`${base} text-madera-400`}>Se guardará al terminar de escribir…</span>;
    case 'checking':
      return (
        <span className={`${base} text-madera-500`}>
          <span className="w-3 h-3 rounded-full border-2 border-madera-400 border-t-transparent animate-spin" aria-hidden="true" />
          Comprobando y guardando…
        </span>
      );
    case 'saved':
      return (
        <span className={`${base} text-musgo-700`}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
          Guardado
        </span>
      );
    case 'taken':
      return <span className={`${base} text-carmesi`}>«{status.name}» no está disponible: otro aventurero ya lo usa.</span>;
    case 'invalid':
      return <span className={`${base} text-carmesi`}>{status.message}</span>;
    case 'error':
      return <span className={`${base} text-carmesi`}>No se pudo guardar. Revisa tu conexión y vuelve a intentarlo.</span>;
    default:
      return null;
  }
}

// The player's profile, all on one screen: the account (name and email come from the institutional account and
// cannot be edited), the nickname (the only thing that can be changed: it saves itself a moment after the last key,
// if no other player uses it), the academic registration and the character in 3D. The character cannot be changed:
// it is only replaced by losing it. Drawn on the page body, above every panel of the game.
export function ProfileModal({ user, onClose }: ProfileModalProps) {
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [status, setStatus] = useState<NickStatus>({ kind: 'idle' });
  // The nickname last saved, the pending autosave and the latest request (an older answer is ignored).
  const saved = useRef(user.nickname ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const character = CHARACTERS.find((candidate) => candidate.glbName === user.avatarName) ?? null;

  const save = useCallback(
    async (value: string) => {
      const name = value.trim();
      if (name === saved.current) return setStatus({ kind: 'idle' });
      if (name.length < MIN_LENGTH) return setStatus({ kind: 'invalid', message: `Escribe al menos ${MIN_LENGTH} caracteres.` });
      const id = ++request.current;
      setStatus({ kind: 'checking' });
      try {
        if (await isNicknameTaken(user.uid, name)) {
          if (alive.current && id === request.current) setStatus({ kind: 'taken', name });
          return;
        }
        await saveProfile(user.uid, { nickname: name });
        saved.current = name;
        useAuthStore.getState().updateUser({ nickname: name });
        if (alive.current && id === request.current) setStatus({ kind: 'saved' });
      } catch (err) {
        console.error('Could not update the nickname:', err);
        if (alive.current && id === request.current) setStatus({ kind: 'error' });
      }
    },
    [user.uid],
  );

  // A moment after the last key, the nickname saves itself.
  const handleChange = (value: string) => {
    setNickname(value);
    clearTimeout(timer.current);
    setStatus(value.trim() === saved.current ? { kind: 'idle' } : { kind: 'typing' });
    timer.current = setTimeout(() => void save(value), AUTOSAVE_MS);
  };

  // "Guardado" fades after a while.
  useEffect(() => {
    if (status.kind !== 'saved') return;
    const fade = setTimeout(() => setStatus({ kind: 'idle' }), SAVED_SHOWN_MS);
    return () => clearTimeout(fade);
  }, [status]);

  // Closing before the moment has passed still saves what was written.
  const latest = useRef(nickname);
  useEffect(() => {
    latest.current = nickname;
  }, [nickname]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current !== undefined) {
        clearTimeout(timer.current);
        void save(latest.current);
      }
    };
  }, [save]);

  // Enter saves at once.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    clearTimeout(timer.current);
    timer.current = undefined;
    void save(nickname);
  };

  const academic = [
    ['Código', user.codigoEstudiantil],
    ['Sede', user.sedeNombre],
    ['Facultad', user.facultadNombre],
    ['Programa', user.programaNombre],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-madera-900/60 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[96dvh] flex flex-col bg-papel-100 rounded-3xl border-[3px] border-madera-600 shadow-2xl overflow-hidden text-madera-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-7 border-b border-madera-600/15 bg-gradient-to-r from-papel-200/70 via-papel-50 to-papel-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/univalle.svg" alt="Universidad del Valle" className="w-9 h-9 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-madera-600">Perfil de usuario</span>
              <h2 id="profile-modal-title" className="font-serif text-base sm:text-lg font-bold tracking-tight text-madera-900 leading-tight">
                Tu aventurero
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-papel-100 hover:bg-papel-300 active:scale-95 text-madera-500 hover:text-madera-800 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer"
            aria-label="Cerrar perfil"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: on phones it may scroll; from tablet width up everything fits */}
        <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-hidden grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] gap-4 sm:gap-6 p-4 sm:p-5">
          {/* Left: account, nickname, registration */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-madera-600/20 bg-papel-50/80">
              <CharacterThumb character={character} photoURL={user.photoURL} name={user.name} className="w-14 h-14 border-2 border-papel-400 shadow-xs" />
              <div className="min-w-0">
                <p className="font-bold text-madera-900 truncate text-sm sm:text-base" title={user.name}>{user.name}</p>
                <p className="text-[11px] sm:text-xs text-madera-500 truncate" title={user.email}>{user.email}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="profile-nickname" className="text-xs font-semibold text-madera-700 flex justify-between">
                <span>Nickname en el videojuego</span>
                <span className="text-madera-400 font-mono text-[11px]">{nickname.length}/16</span>
              </label>
              <input
                id="profile-nickname"
                type="text"
                maxLength={16}
                value={nickname}
                onChange={(e) => handleChange(e.target.value)}
                aria-describedby="profile-nickname-status"
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Ej: Valerius"
                className="uv-input font-medium"
              />
              <div id="profile-nickname-status" role="status" aria-live="polite" className="min-h-[1.25rem] flex items-center">
                {status.kind === 'idle' ? (
                  <p className="text-[10px] sm:text-[11px] text-madera-500">Es lo único que puedes cambiar: se guarda solo al terminar de escribir.</p>
                ) : (
                  <NickStatusLine status={status} />
                )}
              </div>
            </div>

            {academic.length > 0 && (
              <div className="rounded-2xl border border-madera-600/20 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-madera-600 mb-2">Registro académico</p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[11px] sm:text-xs">
                  {academic.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-madera-500">{label}</dt>
                      <dd className="font-semibold text-madera-800 truncate text-right" title={value}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}


          </div>

          {/* Right: the character in 3D */}
          <div className="flex flex-col min-h-0 rounded-2xl border border-madera-600/20 bg-gradient-to-b from-papel-200/60 to-papel-50 overflow-hidden">
            <div className="relative h-[clamp(14rem,48dvh,24rem)] sm:h-auto sm:flex-1 sm:min-h-[14rem]">
              {character ? (
                <Suspense fallback={<img src={character.imagePath} alt={character.name} className="h-full w-full object-contain" />}>
                  <CharacterPreview3D character={character} />
                </Suspense>
              ) : (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-madera-500">
                  Todavía no has elegido tu personaje.
                </p>
              )}
            </div>
            {character && (
              <div className="px-4 py-2.5 border-t border-madera-600/15 bg-papel-50/80 text-center">
                <p className="text-base sm:text-lg font-bold text-madera-900 leading-tight">{character.name}</p>
               
              </div>
            )}
          </div>
        </div>

      </form>
    </div>,
    document.body,
  );
}
