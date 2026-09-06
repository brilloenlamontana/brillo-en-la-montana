import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/mundo');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;

      if (loggedUser) {
        const userData = {
          uid: loggedUser.uid,
          name: loggedUser.displayName || 'Unknown',
          email: loggedUser.email || '',
          photoURL: loggedUser.photoURL || '',
        };

        const userRef = doc(db, 'users', loggedUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, userData);
        }

        setUser(userData);
        navigate('/mundo');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('Hubo un error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(200,16,46,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(16,46,200,0.03) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }} />
      
      <section style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 20px rgba(0,0,0,0.03)',
        borderRadius: '24px',
        padding: '3.5rem 3rem',
        width: '100%',
        maxWidth: '460px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        color: '#1a202c',
        zIndex: 10
      }}>
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <img src="/univalle.svg" alt="logo univalle" style={{ width: '120px', height: 'auto', objectFit: 'contain' }} />
          </div>

          <h1 style={{ 
            fontFamily: '"Snowburst One", system-ui',
            fontSize: '2.5rem', 
            fontWeight: 400, 
            margin: '0 0 2rem 0',
            background: 'linear-gradient(90deg, #C8102E 0%, #E53E3E 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1.5px',
            lineHeight: '1.2'
          }}>
            Brillo en la Montaña
          </h1>
        </header>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            padding: '16px',
            backgroundColor: '#fff',
            color: '#2d3748',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f7fafc';
            e.currentTarget.style.borderColor = '#cbd5e0';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
          }}
        >
          <img src="/univalle.svg" alt="Google" style={{ width: '22px', height: '22px' }} />
          {loading ? 'INICIANDO SESIÓN...' : 'Continuar con Google'}
        </button>
      </section>

      <footer style={{
        position: 'absolute',
        bottom: '2.5rem',
        textAlign: 'center',
        color: '#718096',
        fontSize: '0.75rem',
        letterSpacing: '1px',
        lineHeight: '1.8',
        zIndex: 10
      }}>
        Desarrollado por Dirección de Desarrollo Estudiantil y Éxito Académico - DEXIA.<br/>
        © 2026 Universidad del Valle
      </footer>
    </main>
  );
};
