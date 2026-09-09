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
      <nav style={{
        position: 'absolute',
        top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
        right: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          background: 'rgba(0,0,0,0.5)', 
          padding: '0.4rem 0.8rem', 
          borderRadius: '30px', 
          backdropFilter: 'blur(10px)', 
          border: '1px solid rgba(255,255,255,0.1)' 
        }}>
          {/* Clickable Profile Avatar Button */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            title="Editar perfil y avatar"
            aria-label="Editar perfil y avatar"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              outline: 'none',
              transition: 'transform 0.2s ease, filter 0.2s ease'
            }}
            className="hover:scale-110 active:scale-95 group focus:ring-2 focus:ring-indigo-400"
          >
            {hasValidPhoto ? (
              <img 
                key={user.photoURL}
                src={user.photoURL} 
                alt={user.name || "Perfil"} 
                referrerPolicy="no-referrer"
                onError={() => setFailedPhotoUrl(user.photoURL)}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }} 
              />
            ) : (
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: '#4f46e5', 
                  color: '#ffffff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  userSelect: 'none'
                }}
              >
                {(user.name && user.name[0]) || (user.email && user.email[0]) || 'U'}
              </div>
            )}

            {/* Edit pencil mini-badge */}
            <span 
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '13px',
                height: '13px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                border: '1.5px solid #0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
              }}
            >
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </span>
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            style={{ 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.3)', 
              color: '#fff', 
              padding: '0.4rem 0.8rem', 
              borderRadius: '20px', 
              cursor: 'pointer', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
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
