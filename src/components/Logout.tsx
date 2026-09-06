import React from 'react';
import { useAuthStore } from '../store/authStore';
import { auth } from '../firebase.config';
import { useNavigate } from 'react-router-dom';

export const Logout: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav style={{
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {user.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
        <button 
          onClick={handleLogout}
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
  );
};
