import { useState, type ReactNode } from 'react';
import { CharacterThumb } from '@/components/CharacterThumb';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { CHARACTERS } from '@/data/characters';
import { signOutUser } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

// Top-right bar: profile (opens ProfileModal) and sign out. `leading` goes to the left of the profile (e.g. the
// backpack). Signing out clears the session; the onboarding redirect then takes the player to /login.
export function UserMenu({ leading }: { leading?: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!user) return null;

  // The profile takes the screen: whatever narration or panel of the game was open closes (its voice stops with it).
  // A bajo stays: closing it is what applies its consequence (back to the start, or choosing another character).
  const openProfile = () => {
    const ui = useUIStore.getState();
    if (ui.dialog !== null && !ui.dialog.startsWith('bajo.')) ui.closeDialog();
    ui.setBackpackOpen(false);
    setIsProfileOpen(true);
  };

  return (
    <>
      <nav
        className="absolute top-[max(12px,env(safe-area-inset-top,12px))] right-[max(12px,env(safe-area-inset-right,12px))] z-20 select-none"
        aria-label="Menú de usuario"
      >
        <div className="flex items-center gap-2 bg-papel-200/95 hover:bg-papel-200 px-2.5 py-1.5 rounded-full border-2 border-madera-600 shadow-[0_4px_12px_rgba(62,39,35,0.35)] transition-all">
          {leading}
          <button
            type="button"
            onClick={openProfile}
            title="Editar perfil"
            aria-label="Editar perfil"
            className="relative flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-madera-600"
          >
            <CharacterThumb
              character={CHARACTERS.find((character) => character.glbName === user.avatarName) ?? null}
              photoURL={user.photoURL}
              name={user.name}
              className="w-8 h-8 border border-papel-400 shadow-xs"
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-madera-600 border-2 border-papel-50 flex items-center justify-center text-papel-50 shadow-xs"
              aria-hidden="true"
            >
              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </span>
          </button>

          <div className="w-px h-5 bg-papel-300" />

          <button
            type="button"
            onClick={() => signOutUser().catch((error) => console.error('Could not sign out:', error))}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-madera-600 hover:text-madera-600 hover:bg-papel-200/80 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden md:inline text-[11px]">Salir</span>
          </button>
        </div>
      </nav>

      {isProfileOpen && <ProfileModal user={user} onClose={() => setIsProfileOpen(false)} />}
    </>
  );
}
