import React, { useState } from 'react';
import { useAvatarStore, type AvatarGender } from '../store/avatarStore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Logout } from './Logout';

interface CharacterOption {
  name: string;
  gender: AvatarGender;
  imagePath: string;
  glbName: string;
}

const characters: CharacterOption[] = [
  { name: 'Draconiana', gender: 'female', imagePath: '/sprites-2d/woman/Draconiana.png', glbName: 'Draconiana' },
  { name: 'Elfa', gender: 'female', imagePath: '/sprites-2d/woman/Elfa.png', glbName: 'Elfa' },
  { name: 'Enana', gender: 'female', imagePath: '/sprites-2d/woman/Enana.png', glbName: 'Enana' },
  { name: 'Gnoma', gender: 'female', imagePath: '/sprites-2d/woman/Gnomo.png', glbName: 'Gnoma' },
  { name: 'Humana', gender: 'female', imagePath: '/sprites-2d/woman/Humana.png', glbName: 'Humana' },
  { name: 'Tiflin (Mujer)', gender: 'female', imagePath: '/sprites-2d/woman/Tiflin.png', glbName: 'TiflinMujer' },
  
  { name: 'Draconiano', gender: 'male', imagePath: '/sprites-2d/man/Draconiano.png', glbName: 'Draconiano' },
  { name: 'Elfo', gender: 'male', imagePath: '/sprites-2d/man/Elfo.png', glbName: 'Elfo' },
  { name: 'Enano', gender: 'male', imagePath: '/sprites-2d/man/Enano.png', glbName: 'Enano' },
  { name: 'Gnomo', gender: 'male', imagePath: '/sprites-2d/man/Gnomo.png', glbName: 'Gnomo' },
  { name: 'Humano', gender: 'male', imagePath: '/sprites-2d/man/Humano.png', glbName: 'Humano' },
  { name: 'Tiflin (Hombre)', gender: 'male', imagePath: '/sprites-2d/man/Tiflin.png', glbName: 'TiflinHombre' }
];

export const CharacterSelectionScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(1); // Default to Elfa
  const [nickname, setNickname] = useState('');
  const completeSetup = useAvatarStore((state) => state.completeSetup);
  const navigate = useNavigate();

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
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-gray-100 text-gray-800 font-sans relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-200 rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
      
      <div className="z-10 w-full max-w-4xl px-4 flex flex-col items-center">
        
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-center text-slate-800 tracking-tight">Crea tu Aventurero</h1>
        <p className="text-lg text-slate-500 mb-8 text-center max-w-lg">Elige el personaje con el que explorarás este mundo y dale un nombre legendario.</p>

        {/* Carousel */}
        <div className="relative flex items-center justify-center w-full max-w-3xl mb-10 h-80">
          
          <button 
            onClick={handlePrev} 
            className="absolute left-0 z-20 p-3 m-2 bg-white rounded-full shadow-lg hover:bg-gray-50 hover:scale-110 transition-all focus:outline-none"
            aria-label="Anterior"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
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
                    transform: `translateX(${relativeIndex * 50}%) scale(${isCenter ? 1 : 0.75 - Math.abs(relativeIndex) * 0.1})`,
                    height: '100%'
                  }}
                >
                  <img 
                    src={char.imagePath} 
                    alt={char.name} 
                    className="object-contain max-h-[110%] w-auto drop-shadow-2xl" 
                    style={{ filter: isCenter ? 'none' : 'grayscale(40%)' }}
                  />
                </div>
              );
            })}
          </div>

          <button 
            onClick={handleNext} 
            className="absolute right-0 z-20 p-3 m-2 bg-white rounded-full shadow-lg hover:bg-gray-50 hover:scale-110 transition-all focus:outline-none"
            aria-label="Siguiente"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
          
        </div>

        {/* Selected Character Info */}
        <div className="mb-8 text-center bg-white/70 backdrop-blur-md py-3 px-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-semibold text-slate-800">{currentChar.name}</h2>
          <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">{currentChar.gender === 'male' ? 'Hombre' : 'Mujer'}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSelect} className="flex flex-col sm:flex-row gap-4 w-full max-w-md items-center">
          <input 
            type="text" 
            placeholder="Ingresa tu nickname..." 
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-5 py-4 rounded-xl shadow-sm border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-lg font-medium text-slate-700 placeholder:text-slate-400"
            maxLength={16}
          />
          <button 
            type="submit"
            className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-md hover:shadow-lg font-semibold text-lg transition-all active:scale-95 whitespace-nowrap"
          >
            Comenzar
          </button>
        </form>

      </div>
      <Logout />
    </div>
  );
};
