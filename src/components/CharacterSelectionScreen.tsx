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

  // Si no está autenticado, volver a /login. Si ya configuró personaje, ir a /mundo.
  useEffect(() => {
    if (!user) {
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
    <div className="flex flex-col items-center justify-between min-h-[100dvh] w-full bg-slate-100 text-gray-800 font-sans relative overflow-y-auto px-4 py-8 sm:py-12 select-none">
      
      {/* Background decorations */}
      <div className="absolute top-[-15%] left-[-15%] w-[65vw] max-w-[450px] h-[65vw] max-h-[450px] bg-blue-200 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[65vw] max-w-[450px] h-[65vw] max-h-[450px] bg-purple-200 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none"></div>
      
      {/* Spacer top for logout bar */}
      <div className="h-8 sm:h-4" />

      <div className="z-10 w-full max-w-4xl px-2 sm:px-4 flex flex-col items-center my-auto">
        
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1.5 sm:mb-2 text-center text-slate-800 tracking-tight">
          Crea tu Aventurero
        </h1>
        <p className="text-xs sm:text-base text-slate-500 mb-4 sm:mb-8 text-center max-w-md px-2">
          Elige el personaje con el que explorarás este mundo y dale un nombre legendario.
        </p>

        {/* Carousel */}
        <div className="relative flex items-center justify-center w-full max-w-2xl mb-4 sm:mb-8 h-56 sm:h-72 md:h-80">
          
          <button 
            onClick={handlePrev} 
            className="absolute left-1 sm:left-2 z-20 p-2 sm:p-3 bg-white/90 backdrop-blur-md rounded-full shadow-md hover:bg-white active:scale-95 transition-all focus:outline-none cursor-pointer"
            aria-label="Anterior"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          <div className="flex justify-center items-center overflow-hidden w-full h-full relative perspective-1000">
            {characters.map((char, index) => {
              // Calculate relative position for the carousel effect
              let relativeIndex = index - currentIndex;
              if (relativeIndex < -Math.floor(characters.length / 2)) relativeIndex += characters.length;
              if (relativeIndex > Math.floor(characters.length / 2)) relativeIndex -= characters.length;
              
              const isCenter = relativeIndex === 0;
              const isVisible = Math.abs(relativeIndex) <= 2;
              
              if (!isVisible) return null;

              return (
                <div 
                  key={index}
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
                    className="object-contain max-h-[105%] w-auto drop-shadow-xl" 
                    style={{ filter: isCenter ? 'none' : 'grayscale(40%)' }}
                  />
                </div>
              );
            })}
          </div>

          <button 
            onClick={handleNext} 
            className="absolute right-1 sm:right-2 z-20 p-2 sm:p-3 bg-white/90 backdrop-blur-md rounded-full shadow-md hover:bg-white active:scale-95 transition-all focus:outline-none cursor-pointer"
            aria-label="Siguiente"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
          
        </div>

        {/* Selected Character Info */}
        <div className="mb-4 sm:mb-6 text-center bg-white/80 backdrop-blur-md py-2 px-6 sm:py-3 sm:px-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">{currentChar.name}</h2>
          <span className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-widest">
            {currentChar.gender === 'male' ? 'Hombre' : 'Mujer'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSelect} className="flex flex-col sm:flex-row gap-3 w-full max-w-md items-stretch sm:items-center">
          <input 
            type="text" 
            placeholder="Ingresa tu nickname..." 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 sm:py-3.5 rounded-xl shadow-sm border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-base font-medium text-slate-700 placeholder:text-slate-400 bg-white"
            maxLength={16}
          />
          <button 
            type="submit"
            className="w-full sm:w-auto px-7 py-3 sm:py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-md hover:shadow-lg font-semibold text-base transition-all active:scale-95 whitespace-nowrap cursor-pointer"
          >
            Comenzar
          </button>
        </form>

      </div>
      <Logout />
    </div>
  );
};
