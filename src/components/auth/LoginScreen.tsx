import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../../firebase.config';
import { useAuthStore } from '../../store/authStore';
import { SnowEffect } from '../environment/SnowEffect';

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user) {
        const userData = {
          uid: user.uid,
          name: user.displayName || 'Unknown',
          email: user.email || '',
          photoURL: user.photoURL || '',
        };

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, userData);
        }

        setUser(userData);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('Hubo un error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#4a0d18] flex flex-col items-center justify-center relative overflow-hidden select-none p-4">
      <SnowEffect />
      
      <section className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-6 sm:p-12 w-full max-w-md flex flex-col items-center text-center text-slate-800 z-10">
        <header className="flex flex-col items-center">
          <div className="mb-5 sm:mb-6">
            <img src="/univalle.svg" alt="logo univalle" className="w-24 sm:w-28 h-auto object-contain" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-[#C8102E] to-[#E53E3E] bg-clip-text text-transparent tracking-wide">
            Brillo en la Montaña
          </h1>
        </header>

        <button 
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full p-3.5 sm:p-4 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-sm sm:text-base font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          <img src="/univalle.svg" alt="Google" className="w-5 h-5 sm:w-6 sm:h-6" />
          {loading ? 'Iniciando sesión...' : 'Continuar con Google'}
        </button>
      </section>

      <footer className="absolute bottom-3 sm:bottom-6 text-center text-slate-400 text-[10px] sm:text-xs leading-relaxed z-10 px-4">
        Desarrollado por Dirección de Desarrollo Estudiantil y Éxito Académico - DEXIA<br/>
        © 2026 Universidad del Valle
      </footer>
    </main>
  );
};
