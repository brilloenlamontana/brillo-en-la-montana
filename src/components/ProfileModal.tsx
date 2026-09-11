import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useAvatarStore, type AvatarGender } from '../store/avatarStore';
import { CHARACTERS, type CharacterOption } from '../data/characters';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuthStore();
  const { avatarName, gender, nickname: storeNickname, completeSetup } = useAvatarStore();

  const [nickname, setNickname] = useState(storeNickname || '');
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(avatarName || 'Elfa');
  const [selectedGender, setSelectedGender] = useState<AvatarGender>(gender || 'female');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);



  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const filteredCharacters = CHARACTERS.filter((char) => {
    if (genderFilter === 'all') return true;
    return char.gender === genderFilter;
  });

  const currentSelectedChar = CHARACTERS.find((c) => c.glbName === selectedAvatar) || CHARACTERS[0];

  const handleSelectCharacter = (char: CharacterOption) => {
    setSelectedAvatar(char.glbName);
    setSelectedGender(char.gender);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setFeedback({ type: 'error', message: 'Por favor ingresa un nickname válido' });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const updatedName = displayName.trim() || user.name;
      const userRef = doc(db, 'users', user.uid);

      await setDoc(userRef, {
        nickname: nickname.trim(),
        avatarName: selectedAvatar,
        gender: selectedGender,
        name: updatedName,
      }, { merge: true });

      // Update avatar state (this immediately updates the 3D model in WorldPage)
      completeSetup(nickname.trim(), selectedAvatar, selectedGender);

      // Update user state
      setUser({
        ...user,
        name: updatedName,
      });

      setFeedback({ type: 'success', message: '¡Perfil y avatar actualizados con éxito!' });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error al actualizar el perfil:', err);
      setFeedback({ type: 'error', message: 'Ocurrió un error al guardar los cambios.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-md transition-all duration-300 select-none animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div 
        className="relative w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-100 bg-gradient-to-r from-red-50/70 via-white to-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-red-100 shadow-xs flex items-center justify-center p-1.5 flex-shrink-0">
              <img 
                src="/univalle.svg" 
                alt="Logo Universidad del Valle" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="overflow-hidden">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-red-100 text-[#C8102E] tracking-wide mb-0.5">
                Perfil de Usuario • Identidad Virtual
              </span>
              <h2 id="profile-modal-title" className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                Editar Perfil y Avatar
              </h2>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all focus:outline-none flex-shrink-0 cursor-pointer"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-4 sm:space-y-6">
            {feedback && (
              <div className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-xs ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {feedback.type === 'success' ? (
                  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
                  </svg>
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7">
              {/* Left Column: Account & Profile Details */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-5 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/90">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#C8102E] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Información de Usuario</span>
                </h3>

                {/* Account Photo Card */}
                <div className="flex items-center gap-3.5 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.name || "Foto de perfil"} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-red-200 shadow-xs flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#C8102E] to-[#E53E3E] flex items-center justify-center font-bold text-lg sm:text-xl text-white shadow-xs flex-shrink-0">
                      {(user.name && user.name[0]) || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden min-w-0">
                    <p className="font-bold text-slate-900 truncate text-sm sm:text-base">{displayName || user.name}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 truncate">{user.email}</p>
                    <span className="uv-badge-emerald mt-1">
                      Google Vinculado
                    </span>
                  </div>
                </div>

                {/* Input Nickname */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex justify-between">
                    <span>Nickname en el videojuego *</span>
                    <span className="text-slate-400 font-mono text-[11px]">{nickname.length}/16</span>
                  </label>
                  <input 
                    type="text"
                    maxLength={16}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Ej: Valerius"
                    className="uv-input font-medium"
                  />
                  <p className="text-[10px] sm:text-[11px] text-slate-500">Nombre público visible sobre tu avatar en el mundo 3D.</p>
                </div>

                {/* Input Display Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Nombre institucional visible
                  </label>
                  <input 
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Tu nombre completo"
                    className="uv-input font-medium"
                  />
                </div>

                {/* Current Selected Avatar Preview Badge */}
                <div className="pt-2 border-t border-slate-200/80">
                  <p className="text-[11px] sm:text-xs text-slate-500 mb-1.5 font-medium">Avatar actual seleccionado:</p>
                  <div className="flex items-center gap-3 p-2 sm:p-2.5 bg-red-50/60 rounded-xl border border-red-100">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white p-1 flex items-center justify-center border border-red-100 overflow-hidden flex-shrink-0 shadow-xs">
                      <img 
                        src={currentSelectedChar.imagePath} 
                        alt={currentSelectedChar.name} 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{currentSelectedChar.name}</p>
                      <span className="text-[10px] sm:text-[11px] text-[#C8102E] font-medium capitalize">
                        {currentSelectedChar.gender === 'male' ? 'Hombre' : 'Mujer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Academic Information Card */}
                {user.codigoEstudiantil && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <p className="text-[11px] sm:text-xs text-[#C8102E] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Registro Académico</span>
                      <span className="text-[9px] text-slate-400 font-normal">Univalle</span>
                    </p>
                    <div className="p-3 rounded-2xl bg-white border border-slate-200 text-xs space-y-2 shadow-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Código Estudiantil:</span>
                        <span className="font-mono font-bold text-[#C8102E] bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                          {user.codigoEstudiantil}
                        </span>
                      </div>
                      {user.sedeNombre && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Sede:</span>
                          <span className="text-slate-800 font-semibold truncate max-w-[180px] text-right" title={user.sedeNombre}>{user.sedeNombre}</span>
                        </div>
                      )}
                      {user.facultadNombre && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Facultad:</span>
                          <span className="text-slate-800 font-semibold truncate max-w-[180px] text-right" title={user.facultadNombre}>{user.facultadNombre}</span>
                        </div>
                      )}
                      {user.programaNombre && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Programa:</span>
                          <span className="text-slate-800 font-semibold truncate max-w-[180px] text-right" title={user.programaNombre}>{user.programaNombre}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ley 1581 de 2012 Status */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800">Ley 1581 de 2012</p>
                        <p className="text-[10px] text-slate-500 truncate">Uso institucional • Sin divulgación</p>
                      </div>
                    </div>
                    <span className="uv-badge-emerald flex-shrink-0">
                      Autorizado
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Character Selection Grid */}
              <div className="lg:col-span-7 space-y-3 sm:space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#C8102E] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polygon strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>Seleccionar Personaje 3D</span>
                  </h3>

                  {/* Filter Tabs */}
                  <div className="grid grid-cols-3 sm:flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setGenderFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                        genderFilter === 'all' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos ({CHARACTERS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('female')}
                      className={`px-3 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                        genderFilter === 'female' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mujeres
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('male')}
                      className={`px-3 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                        genderFilter === 'male' ? 'bg-[#C8102E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Hombres
                    </button>
                  </div>
                </div>

                {/* Characters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 max-h-[280px] sm:max-h-[390px] overflow-y-auto pr-1">
                  {filteredCharacters.map((char) => {
                    const isSelected = selectedAvatar === char.glbName;
                    return (
                      <button
                        key={char.glbName}
                        type="button"
                        onClick={() => handleSelectCharacter(char)}
                        className={`group relative flex flex-col items-center p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 focus:outline-none cursor-pointer ${
                          isSelected
                            ? 'bg-red-50/50 border-2 border-[#C8102E] shadow-md shadow-red-500/10 scale-[1.02]'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm active:scale-95'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#C8102E] text-white flex items-center justify-center shadow-xs">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}

                        <div className="w-full h-20 sm:h-28 flex items-center justify-center relative overflow-hidden my-1">
                          <img 
                            src={char.imagePath} 
                            alt={char.name} 
                            className={`max-h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105 ${
                              isSelected ? 'scale-105' : 'grayscale-[20%]'
                            }`}
                          />
                        </div>

                        <div className="w-full mt-1 text-center">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#C8102E]' : 'text-slate-800'}`}>
                            {char.name}
                          </p>
                          <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            {char.gender === 'male' ? 'Hombre' : 'Mujer'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="uv-btn-secondary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="uv-btn-primary w-full sm:w-auto text-xs sm:text-sm py-2.5 px-7"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
