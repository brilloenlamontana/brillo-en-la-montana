import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAvatarStore } from '../store/avatarStore';
import { auth } from '../firebase.config';
import { useNavigate } from 'react-router-dom';
import { ProfileModal } from './ProfileModal';

export const Logout: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    useAvatarStore.getState().resetAvatar();
    setUser(null);
    navigate('/login');
  };

  if (!user) return null;

  const hasValidPhoto = Boolean(user.photoURL && failedPhotoUrl !== user.photoURL);

  return (
    <>
      <nav 
        style={{
          position: 'absolute',
          top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
          right: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
          zIndex: 20,
        }}
        className="select-none"
        aria-label="Menú de usuario"
      >
        <div className="flex items-center gap-2 bg-white/90 hover:bg-white backdrop-blur-md px-2.5 py-1.5 rounded-full border border-slate-200/90 shadow-md transition-all">
          {/* Clickable Profile Avatar Button */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            title="Editar perfil y avatar"
            aria-label="Editar perfil y avatar"
            className="relative flex items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer group focus-visible:ring-2 focus-visible:ring-[#C8102E]"
          >
            {hasValidPhoto ? (
              <img 
                key={user.photoURL}
                src={user.photoURL} 
                alt={user.name || "Perfil"} 
                referrerPolicy="no-referrer"
                onError={() => setFailedPhotoUrl(user.photoURL)}
                className="w-8 h-8 rounded-full object-cover border border-red-200 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C8102E] to-[#E53E3E] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {(user.name && user.name[0]) || (user.email && user.email[0]) || 'U'}
              </div>
            )}

            {/* Edit pencil mini-badge */}
            <span 
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#C8102E] border-2 border-white flex items-center justify-center text-white shadow-xs"
              aria-hidden="true"
            >
              <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </span>
          </button>

          {/* User Name Tag */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="hidden sm:flex flex-col text-left pl-1 pr-2 hover:opacity-80 transition cursor-pointer"
            title="Abrir perfil institucional"
          >
            <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
              {user.name || 'Estudiante'}
            </span>
            <span className="text-[10px] font-medium text-[#C8102E] leading-none">
              Univalle
            </span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200" />

          {/* Logout Button */}
          <button 
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-600 hover:text-[#C8102E] hover:bg-red-50/80 active:scale-95 transition-all cursor-pointer"
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

      {/* Profile & Avatar Editing Modal */}
      {isProfileModalOpen && (
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      )}
    </>
  );
};
