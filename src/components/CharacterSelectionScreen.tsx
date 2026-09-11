import React, { useState, useEffect } from 'react';
import { useAvatarStore } from '../store/avatarStore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Logout } from './Logout';

import { CHARACTERS as characters } from '../data/characters';


export const CharacterSelectionScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { hasSelectedCharacter, completeSetup } = useAvatarStore();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(1); // Default to Elfa
  const [nickname, setNickname] = useState('');

  // Si no está autenticado, no ha aceptado la Ley 1581 o no ha completado el registro estudiantil, volver a /login. Si ya configuró personaje, ir a /mundo.
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!user.acceptedLaw1581 || !user.codigoEstudiantil) {
      navigate('/login');
    } else if (hasSelectedCharacter) {
      navigate('/mundo');
    }
  }, [user, hasSelectedCharacter, navigate]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % characters.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length);
  };

  const handleSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('Por favor ingresa un nickname');
      return;
    }
    const selectedChar = characters[currentIndex];
    
    try {
      const user = useAuthStore.getState().user;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          nickname: nickname,
          avatarName: selectedChar.glbName,
          gender: selectedChar.gender
        }, { merge: true });
      }
      completeSetup(nickname, selectedChar.glbName, selectedChar.gender);
      navigate('/mundo');
    } catch (error) {
      console.error('Error guardando el personaje:', error);
      alert('Hubo un error al guardar tu personaje. Inténtalo de nuevo.');
    }
  };

  const currentChar = characters[currentIndex];

  return (
    <div className="flex flex-col items-center justify-between min-h-[100dvh] w-full bg-gradient-to-br from-slate-50 via-red-50/25 to-slate-100 text-slate-800 font-sans relative overflow-y-auto px-4 py-8 sm:py-10 select-none">
      {/* Background ambient decorations in Univalle tones */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] max-w-[420px] h-[60vw] max-h-[420px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] max-w-[420px] h-[60vw] max-h-[420px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top spacer for HUD navigation bar */}
      <div className="h-10 sm:h-6" />

      <div className="z-10 w-full max-w-4xl px-2 sm:px-4 flex flex-col items-center my-auto">
        {/* Institutional Pill */}
        <div className="mb-2">
          <span className="uv-badge-red">
            <svg className="w-3 h-3 text-[#C8102E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Personalización de Avatar Institucional
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-1.5 sm:mb-2 text-center text-slate-900 tracking-tight">
          Crea tu Aventurero
        </h1>
        <p className="text-xs sm:text-base text-slate-500 mb-6 sm:mb-8 text-center max-w-md px-2 leading-relaxed">
          Elige el personaje con el que explorarás el campus virtual y dale un nickname legendario.
        </p>

        {/* Carousel */}
        <div className="relative flex items-center justify-center w-full max-w-2xl mb-4 sm:mb-8 h-56 sm:h-72 md:h-80">
          <button 
            type="button"
            onClick={handlePrev} 
            className="absolute left-1 sm:left-3 z-20 p-2.5 sm:p-3 bg-white/90 hover:bg-white text-[#C8102E] backdrop-blur-md rounded-2xl shadow-md hover:shadow-lg border border-slate-200/80 active:scale-95 transition-all focus:outline-none cursor-pointer group"
            aria-label="Anterior personaje"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex justify-center items-center overflow-hidden w-full h-full relative perspective-1000">
            {characters.map((char, index) => {
              let relativeIndex = index - currentIndex;
              if (relativeIndex < -Math.floor(characters.length / 2)) relativeIndex += characters.length;
              if (relativeIndex > Math.floor(characters.length / 2)) relativeIndex -= characters.length;
              
              const isCenter = relativeIndex === 0;
              const isVisible = Math.abs(relativeIndex) <= 2;
              
              if (!isVisible) return null;

              return (
                <div 
                  key={char.glbName}
                  className={`absolute transition-all duration-500 ease-out flex flex-col items-center justify-end
                    ${isCenter ? 'z-10 scale-100 opacity-100' : 'z-0 opacity-40'}
                  `}
                  style={{
                    transform: `translateX(${relativeIndex * 45}%) scale(${isCenter ? 1 : 0.75 - Math.abs(relativeIndex) * 0.1})`,
                    height: '100%'
                  }}
                >
                  <img 
                    src={char.imagePath} 
                    alt={char.name} 
                    className="object-contain max-h-[105%] w-auto drop-shadow-2xl" 
                    style={{ filter: isCenter ? 'none' : 'grayscale(35%)' }}
                  />
                </div>
              );
            })}
          </div>

          <button 
            type="button"
            onClick={handleNext} 
            className="absolute right-1 sm:right-3 z-20 p-2.5 sm:p-3 bg-white/90 hover:bg-white text-[#C8102E] backdrop-blur-md rounded-2xl shadow-md hover:shadow-lg border border-slate-200/80 active:scale-95 transition-all focus:outline-none cursor-pointer group"
            aria-label="Siguiente personaje"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Selected Character Info Card */}
        <div className="mb-5 sm:mb-7 text-center bg-white/95 backdrop-blur-md py-2.5 px-7 sm:py-3 sm:px-9 rounded-2xl shadow-sm border border-slate-200/80">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">{currentChar.name}</h2>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {currentChar.gender === 'male' ? 'Hombre' : 'Mujer'}
          </span>
        </div>

        {/* Nickname Form */}
        <form onSubmit={handleSelect} className="flex flex-col sm:flex-row gap-3 w-full max-w-md items-stretch sm:items-center">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Ingresa tu nickname..." 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="uv-input text-base sm:text-sm font-medium pr-14"
              maxLength={16}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 pointer-events-none">
              {nickname.length}/16
            </span>
          </div>
          <button 
            type="submit"
            className="uv-btn-primary whitespace-nowrap text-sm sm:text-base py-3 px-7"
          >
            <span>Comenzar Aventura</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>

      <Logout />
    </div>
  );
};
