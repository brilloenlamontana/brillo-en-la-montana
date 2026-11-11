import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { CharacterThumb } from '@/components/CharacterThumb';
import { CHARACTERS } from '@/data/characters';
import { saveProfile } from '@/services/userService';
import { useAuthStore, type UserData } from '@/store/authStore';

// three.js only loads when the profile opens (the login and selection pages do not need it otherwise).
const CharacterPreview3D = lazy(() => import('@/components/CharacterPreview3D').then((m) => ({ default: m.CharacterPreview3D })));

type ProfileModalProps = { user: UserData; onClose: () => void };

// The player's profile, all on one screen: the account (name and email come from the institutional account and
// cannot be edited), the nickname (the only thing that can be changed), the academic registration and the character
// in 3D. The character cannot be changed: it is only replaced by losing it.
export function ProfileModal({ user, onClose }: ProfileModalProps) {
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const character = CHARACTERS.find((candidate) => candidate.glbName === user.avatarName) ?? null;
  const unchanged = nickname.trim() === (user.nickname ?? '');

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setFeedback({ type: 'error', message: 'Por favor ingresa un nickname válido.' });
      return;
    }
    try {
      setIsSaving(true);
      setFeedback(null);
      const profile = { nickname: nickname.trim() };
      await saveProfile(user.uid, profile);
      useAuthStore.getState().updateUser(profile);
      setFeedback({ type: 'success', message: '¡Nickname actualizado!' });
      setTimeout(onClose, 900);
    } catch (err) {
      console.error('Could not update the profile:', err);
      setFeedback({ type: 'error', message: 'Ocurrió un error al guardar los cambios.' });
    } finally {
      setIsSaving(false);
    }
  };

  const academic = [
    ['Código', user.codigoEstudiantil],
    ['Sede', user.sedeNombre],
    ['Facultad', user.facultadNombre],
    ['Programa', user.programaNombre],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[96dvh] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-7 border-b border-slate-100 bg-gradient-to-r from-red-50/70 via-white to-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/univalle.svg" alt="Universidad del Valle" className="w-9 h-9 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#C8102E]">Perfil de usuario</span>
              <h2 id="profile-modal-title" className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                Tu aventurero
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer"
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
            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/80">
              <CharacterThumb character={character} photoURL={user.photoURL} name={user.name} className="w-14 h-14 border-2 border-red-200 shadow-xs" />
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate text-sm sm:text-base" title={user.name}>{user.name}</p>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate" title={user.email}>{user.email}</p>
                <span className="uv-badge-emerald mt-1">Cuenta institucional</span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="profile-nickname" className="text-xs font-semibold text-slate-700 flex justify-between">
                <span>Nickname en el videojuego</span>
                <span className="text-slate-400 font-mono text-[11px]">{nickname.length}/16</span>
              </label>
              <input
                id="profile-nickname"
                type="text"
                maxLength={16}
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setFeedback(null);
                }}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Ej: Valerius"
                className="uv-input font-medium"
              />
              <p className="text-[10px] sm:text-[11px] text-slate-500">Es lo único que puedes cambiar. Tu nombre viene de tu cuenta institucional.</p>
            </div>

            {academic.length > 0 && (
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#C8102E] mb-2">Registro académico</p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[11px] sm:text-xs">
                  {academic.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="font-semibold text-slate-800 truncate text-right" title={value}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 text-[11px]">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate"><strong className="text-slate-800">Ley 1581 de 2012</strong> · uso institucional, sin divulgación</span>
              </span>
              <span className="uv-badge-emerald flex-shrink-0">Autorizado</span>
            </div>

            {feedback && (
              <p
                role="status"
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${
                  feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>

          {/* Right: the character in 3D */}
          <div className="flex flex-col min-h-0 rounded-2xl border border-slate-200 bg-gradient-to-b from-red-50/60 to-white overflow-hidden">
            <div className="relative h-[clamp(14rem,48dvh,24rem)] sm:h-auto sm:flex-1 sm:min-h-[14rem]">
              {character ? (
                <Suspense fallback={<img src={character.imagePath} alt={character.name} className="h-full w-full object-contain" />}>
                  <CharacterPreview3D character={character} />
                </Suspense>
              ) : (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
                  Todavía no has elegido tu personaje.
                </p>
              )}
            </div>
            {character && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-white/80 text-center">
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{character.name}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                  No se puede cambiar: solo eliges otro si caes en tercer bajo rendimiento.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 px-4 py-3 sm:px-6 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isSaving} className="uv-btn-secondary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-5">
            Cerrar
          </button>
          <button type="submit" disabled={isSaving || unchanged} className="uv-btn-primary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-7">
            {isSaving ? 'Guardando…' : 'Guardar nickname'}
          </button>
        </div>
      </form>
    </div>
  );
}
