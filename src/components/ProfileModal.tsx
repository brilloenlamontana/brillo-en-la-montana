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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col bg-slate-900/95 text-white rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-slate-950/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="overflow-hidden">
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
                Editar Perfil y Avatar
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Modifica tus datos y elige tu personaje</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 active:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-all focus:outline-none flex-shrink-0"
            title="Cerrar modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {feedback && (
              <div className={`p-3 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
                feedback.type === 'success' 
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
              }`}>
                {feedback.type === 'success' ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              {/* Left Column: Account & Profile Details */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-5 bg-white/[0.02] p-4 sm:p-5 rounded-2xl border border-white/5">
                <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Información de Usuario
                </h3>

                {/* Account Photo Card */}
                <div className="flex items-center gap-3.5 p-3 bg-white/5 rounded-2xl border border-white/10">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.name || "Foto de perfil"} 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-indigo-400/50 shadow-md flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-lg sm:text-xl text-white shadow-md flex-shrink-0">
                      {(user.name && user.name[0]) || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden min-w-0">
                    <p className="font-semibold text-white truncate text-sm sm:text-base">{displayName || user.name}</p>
                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-0.5 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                      Google Vinculado
                    </span>
                  </div>
                </div>

                {/* Input Nickname */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex justify-between">
                    <span>Nickname en el juego *</span>
                    <span className="text-slate-500">{nickname.length}/16</span>
                  </label>
                  <input 
                    type="text"
                    maxLength={16}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Ej: Valerius"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-white text-base sm:text-sm transition-all placeholder:text-slate-600"
                  />
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Nombre visible en el mundo 3D.</p>
                </div>

                {/* Input Display Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nombre público
                  </label>
                  <input 
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Tu nombre completo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-white text-base sm:text-sm transition-all placeholder:text-slate-600"
                  />
                </div>

                {/* Current Selected Avatar Preview Badge */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-[11px] sm:text-xs text-slate-400 mb-1.5">Avatar seleccionado:</p>
                  <div className="flex items-center gap-3 p-2 sm:p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-500/20">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-800/80 p-1 flex items-center justify-center border border-white/10 overflow-hidden flex-shrink-0">
                      <img 
                        src={currentSelectedChar.imagePath} 
                        alt={currentSelectedChar.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-indigo-200 truncate">{currentSelectedChar.name}</p>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 capitalize">
                        {currentSelectedChar.gender === 'male' ? 'Hombre' : 'Mujer'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Character Selection Grid */}
              <div className="lg:col-span-7 space-y-3 sm:space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Seleccionar Personaje
                  </h3>

                  {/* Filter Tabs */}
                  <div className="grid grid-cols-3 sm:flex p-1 bg-slate-950/60 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setGenderFilter('all')}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all text-center ${
                        genderFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos ({CHARACTERS.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('female')}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all text-center ${
                        genderFilter === 'female' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Mujeres
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('male')}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-all text-center ${
                        genderFilter === 'male' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hombres
                    </button>
                  </div>
                </div>

                {/* Characters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-h-[260px] sm:max-h-[380px] overflow-y-auto pr-1">
                  {filteredCharacters.map((char) => {
                    const isSelected = selectedAvatar === char.glbName;
                    return (
                      <button
                        key={char.glbName}
                        type="button"
                        onClick={() => handleSelectCharacter(char)}
                        className={`group relative flex flex-col items-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 focus:outline-none cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-b from-indigo-600/30 to-purple-700/20 border-indigo-400 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-white/20 active:scale-95'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}

                        <div className="w-full h-20 sm:h-28 flex items-center justify-center relative overflow-hidden my-1">
                          <img 
                            src={char.imagePath} 
                            alt={char.name} 
                            className={`max-h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110 ${
                              isSelected ? 'scale-105' : 'grayscale-[20%]'
                            }`}
                          />
                        </div>

                        <div className="w-full mt-1 text-center">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-200' : 'text-slate-200'}`}>
                            {char.name}
                          </p>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
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
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 p-3.5 sm:p-5 border-t border-white/10 bg-slate-950/70 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/5 active:bg-white/10 transition-all text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-7 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
