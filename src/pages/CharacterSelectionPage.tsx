import { useState, type FormEvent } from 'react';
import { useOnboardingRedirect } from '@/app/onboarding';
import { UserMenu } from '@/components/auth/UserMenu';
import { availableCharacters, CHARACTERS } from '@/data/characters';
import { useMenuMusic } from '@/game/engine/audio/useMenuMusic';
import { SoundToggle } from '@/game/hud/SoundToggle';
import { saveCharacter } from '@/services/userService';
import { useAuthStore, type AvatarGender } from '@/store/authStore';

const GENDERS: { gender: AvatarGender; label: string; imagePath: string }[] = [
  { gender: 'female', label: 'Mujer', imagePath: '/sprites-2d/woman/Elfa.png' },
  { gender: 'male', label: 'Hombre', imagePath: '/sprites-2d/man/Elfo.png' },
];

// The player first chooses woman or man, then one of that gender's characters and a nickname; saving it completes the
// onboarding and the redirect opens the world. Characters lost to a third "bajo" are no longer offered.
export default function CharacterSelectionPage() {
  const step = useOnboardingRedirect('/seleccion-personaje');
  useMenuMusic();
  const lostCharacters = useAuthStore((state) => state.user?.lostCharacters);
  const [gender, setGender] = useState<AvatarGender | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nickname, setNickname] = useState('');

  if (step !== 'personaje') return null;

  const available = availableCharacters(lostCharacters);
  const lost = CHARACTERS.filter((character) => !available.includes(character));
  const characters = available.filter((character) => character.gender === gender);
  const currentChar = characters[Math.min(currentIndex, characters.length - 1)];

  const chooseGender = (next: AvatarGender | null) => {
    setGender(next);
    setCurrentIndex(0);
  };
  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % characters.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length);

  const handleSelect = async (event: FormEvent) => {
    event.preventDefault();
    const name = nickname.trim();
    const user = useAuthStore.getState().user;
    if (!name) {
      alert('Por favor ingresa un nickname');
      return;
    }
    if (!user || !currentChar) return;
    const character = { nickname: name, avatarName: currentChar.glbName, gender: currentChar.gender };
    try {
      await saveCharacter(user.uid, character);
      useAuthStore.getState().updateUser(character);
    } catch (error) {
      console.error('Could not save the character:', error);
      alert('Hubo un error al guardar tu personaje. Inténtalo de nuevo.');
    }
  };

  const lostNotice = lost.length > 0 && (
    <div className="mb-3 sm:mb-4 w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs sm:text-sm text-red-900 shadow-xs" role="status">
      <p className="font-bold">Acabaste de perder: ya no puedes volver a jugar con {lost.map((character) => character.name).join(', ')}.</p>
      <p className="mt-0.5">Puedes volver a entrar, pero tienes que escoger otro personaje y comenzar desde cero, con tres estrellas.</p>
    </div>
  );

  if (!gender || !currentChar) {
    return (
      <div className="flex flex-col items-center h-[100dvh] w-full bg-gradient-to-br from-slate-50 via-red-50/25 to-slate-100 text-slate-800 font-sans relative overflow-hidden px-4 py-3 sm:py-5 select-none">
        <div className="z-10 w-full max-w-4xl px-2 sm:px-4 flex-1 min-h-0 flex flex-col items-center justify-center">
          <h1 className="text-2xl sm:text-4xl md:text-5xl [@media(max-height:700px)]:!text-3xl font-extrabold mb-1.5 sm:mb-2 text-center text-slate-900 tracking-tight">
            Crea tu Aventurero
          </h1>
          <p className="text-xs sm:text-base text-slate-500 mb-4 sm:mb-6 [@media(max-height:700px)]:mb-3 text-center max-w-md px-2 leading-relaxed">
            Primero elige si tu aventurero será mujer u hombre
          </p>
          {lostNotice}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 w-full max-w-xl">
            {GENDERS.map((option) => {
              const count = available.filter((character) => character.gender === option.gender).length;
              return (
                <button
                  key={option.gender}
                  type="button"
                  disabled={count === 0}
                  onClick={() => chooseGender(option.gender)}
                  className="group flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm transition-all hover:border-[#C8102E] hover:shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <img src={option.imagePath} alt="" className="h-[min(15rem,34dvh)] object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105" />
                  <span className="mt-3 text-lg sm:text-2xl font-bold text-slate-900">{option.label}</span>
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {count === 0 ? 'Sin personajes disponibles' : `${count} ${count === 1 ? 'personaje' : 'personajes'}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <UserMenu leading={<SoundToggle />} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-[100dvh] w-full bg-gradient-to-br from-slate-50 via-red-50/25 to-slate-100 text-slate-800 font-sans relative overflow-hidden px-4 py-3 sm:py-5 select-none">
      {/* Background ambient decorations in Univalle tones */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] max-w-[420px] h-[60vw] max-h-[420px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] max-w-[420px] h-[60vw] max-h-[420px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="z-10 w-full max-w-4xl px-2 sm:px-4 flex-1 min-h-0 flex flex-col items-center justify-center pt-8 sm:pt-0">
        {/* Institutional Pill */}
 

        <h1 className="text-2xl sm:text-4xl md:text-5xl [@media(max-height:700px)]:!text-3xl font-extrabold mb-1 sm:mb-2 text-center text-slate-900 tracking-tight">
          Crea tu Aventurero
        </h1>
        <p className="text-xs sm:text-base text-slate-500 mb-3 sm:mb-5 [@media(max-height:600px)]:hidden text-center max-w-md px-2 leading-relaxed">
          Elige el personaje con el que explorarás el mundo y dale un nickname legendario. No podrás cambiar de personaje después.
        </p>

        <button
          type="button"
          onClick={() => chooseGender(null)}
          className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-600 shadow-xs hover:text-[#C8102E] hover:border-[#C8102E] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          <span>{gender === 'male' ? 'Hombre' : 'Mujer'} · cambiar</span>
        </button>

        {/* Carousel */}
        <div className="relative flex items-center justify-center w-full max-w-2xl mb-3 sm:mb-5 flex-1 min-h-[7rem] max-h-[22rem]">
          <button 
            type="button"
            onClick={handlePrev} 
            className="absolute left-1 sm:left-3 z-20 p-2.5 sm:p-3 bg-white/90 hover:bg-white text-[#C8102E] backdrop-blur-md rounded-2xl shadow-md hover:shadow-lg border border-slate-200/80 active:scale-95 transition-all focus:outline-none cursor-pointer group disabled:hidden"
            disabled={characters.length < 2}
            aria-label="Anterior personaje"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex justify-center items-center overflow-hidden absolute inset-0 perspective-1000">
            {characters.map((char, index) => {
              let relativeIndex = index - characters.indexOf(currentChar);
              if (relativeIndex < -Math.floor(characters.length / 2)) relativeIndex += characters.length;
              if (relativeIndex > Math.floor(characters.length / 2)) relativeIndex -= characters.length;
              
              const isCenter = relativeIndex === 0;
              const isVisible = Math.abs(relativeIndex) <= 2 && (characters.length > 4 || Math.abs(relativeIndex) <= 1);
              
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
            className="absolute right-1 sm:right-3 z-20 p-2.5 sm:p-3 bg-white/90 hover:bg-white text-[#C8102E] backdrop-blur-md rounded-2xl shadow-md hover:shadow-lg border border-slate-200/80 active:scale-95 transition-all focus:outline-none cursor-pointer group disabled:hidden"
            disabled={characters.length < 2}
            aria-label="Siguiente personaje"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Selected Character Info Card */}
        <div className="mb-3 sm:mb-5 text-center bg-white/95 backdrop-blur-md py-1.5 px-7 sm:py-2.5 sm:px-9 rounded-2xl shadow-sm border border-slate-200/80">
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

      <UserMenu leading={<SoundToggle />} />
    </div>
  );
}
