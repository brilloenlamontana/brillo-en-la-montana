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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md transition-all duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900/95 text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Editar Perfil y Avatar
              </h2>
              <p className="text-xs text-slate-400">Modifica tus datos y elige el personaje para tu aventura</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-all focus:outline-none"
            title="Cerrar modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {feedback && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-3 transition-all ${
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Account & Profile Details */}
            <div className="lg:col-span-5 space-y-5 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Información de Usuario
              </h3>

              {/* Account Photo Card */}
              <div className="flex items-center gap-4 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.name || "Foto de perfil"} 
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400/50 shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xl text-white shadow-md">
                    {(user.name && user.name[0]) || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-semibold text-white truncate text-base">{displayName || user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                    Cuenta Google Vinculada
                  </span>
                </div>
              </div>

              {/* Input Nickname */}
              <div className="space-y-1.5">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-white text-sm transition-all placeholder:text-slate-600"
                />
                <p className="text-[11px] text-slate-400">Este nombre será visible en tus partidas.</p>
              </div>

              {/* Input Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nombre público
                </label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Tu nombre completo"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-white text-sm transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Current Selected Avatar Preview Badge */}
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-slate-400 mb-2">Avatar actualmente activo:</p>
                <div className="flex items-center gap-3 p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-500/20">
                  <div className="w-12 h-12 rounded-lg bg-slate-800/80 p-1 flex items-center justify-center border border-white/10 overflow-hidden">
                    <img 
                      src={currentSelectedChar.imagePath} 
                      alt={currentSelectedChar.name} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-200">{currentSelectedChar.name}</p>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {currentSelectedChar.gender === 'male' ? 'Hombre' : 'Mujer'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Character Selection Grid */}
            <div className="lg:col-span-7 space-y-4 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Seleccionar Personaje
                </h3>

                {/* Filter Tabs */}
                <div className="inline-flex p-1 bg-slate-950/60 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setGenderFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      genderFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({CHARACTERS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderFilter('female')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      genderFilter === 'female' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Mujeres
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderFilter('male')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      genderFilter === 'male' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hombres
                  </button>
                </div>
              </div>

              {/* Characters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredCharacters.map((char) => {
                  const isSelected = selectedAvatar === char.glbName;
                  return (
                    <button
                      key={char.glbName}
                      type="button"
                      onClick={() => handleSelectCharacter(char)}
                      className={`group relative flex flex-col items-center p-3 rounded-2xl border text-left transition-all duration-200 focus:outline-none ${
                        isSelected
                          ? 'bg-gradient-to-b from-indigo-600/30 to-purple-700/20 border-indigo-400 shadow-lg shadow-indigo-500/10 scale-[1.02]'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      <div className="w-full h-28 flex items-center justify-center relative overflow-hidden my-1">
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
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {char.gender === 'male' ? 'Hombre' : 'Mujer'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
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
