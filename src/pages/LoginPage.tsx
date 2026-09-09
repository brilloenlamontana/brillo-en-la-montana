import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useAvatarStore } from '../store/avatarStore';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuthStore();
  const { hasSelectedCharacter } = useAvatarStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (hasSelectedCharacter) {
        navigate('/mundo');
      } else {
        navigate('/seleccion-personaje');
      }
    }
  }, [user, hasSelectedCharacter, navigate]);

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
          useAvatarStore.getState().resetAvatar();
          setUser(userData);
          navigate('/seleccion-personaje');
        } else {
          const data = userSnap.data();
          if (data && data.nickname && data.avatarName) {
            useAvatarStore.getState().completeSetup(data.nickname, data.avatarName, data.gender || 'female');
            setUser(userData);
            navigate('/mundo');
          } else {
            useAvatarStore.getState().resetAvatar();
            setUser(userData);
            navigate('/seleccion-personaje');
          }
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('Hubo un error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex flex-col justify-between items-center px-4 py-6 sm:py-10 relative overflow-x-hidden select-none">
      {/* Ambient background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] max-w-[400px] h-[60vw] max-h-[400px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[70vw] max-w-[500px] h-[70vw] max-h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Spacer top */}
      <div className="h-2 sm:h-6" />

      {/* Main Login Card */}
      <section className="w-full max-w-md mx-auto my-auto bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-3xl p-6 sm:p-10 flex flex-col items-center text-center z-10">
        <header className="flex flex-col items-center w-full">
          <div className="mb-4 sm:mb-6 p-2 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-inner">
            <img 
              src="/univalle.svg" 
              alt="Logo Universidad del Valle" 
              className="w-20 sm:w-28 h-auto object-contain drop-shadow-sm" 
            />
          </div>

          <h1 
            style={{ fontFamily: '"Snowburst One", system-ui' }}
            className="text-2xl sm:text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#C8102E] to-[#E53E3E] tracking-wider mb-2 leading-tight"
          >
            Brillo en la Montaña
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8 max-w-xs">
            Ingresa con tu cuenta institucional para explorar el mundo 3D y personalizar tu avatar.
          </p>
        </header>

        {/* Google Sign In Button */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 sm:py-4 px-5 rounded-2xl flex items-center justify-center gap-3 bg-white text-slate-700 font-semibold border border-slate-200/80 shadow-sm hover:shadow-md hover:bg-slate-50 active:scale-[0.98] transition-all text-sm sm:text-base cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <img src="/univalle.svg" alt="Google" className="w-5 h-5 object-contain" />
          <span>{loading ? 'Iniciando sesión...' : 'Continuar con Google'}</span>
        </button>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-md text-center text-slate-400 text-[11px] sm:text-xs tracking-wide leading-relaxed pt-6 pb-2 z-10">
        <p>Desarrollado por Dirección de Desarrollo Estudiantil y Éxito Académico - DEXIA</p>
        <p className="mt-0.5 text-slate-400/80">© 2026 Universidad del Valle</p>
      </footer>
    </main>
  );
};
