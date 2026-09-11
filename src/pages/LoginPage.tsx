import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase.config';
import { useAuthStore, type UserData } from '../store/authStore';
import { useAvatarStore } from '../store/avatarStore';
import { useNavigate } from 'react-router-dom';
import { Law1581ConsentModal } from '../components/Law1581ConsentModal';
import { StudentRegistrationModal, type StudentRegistrationData } from '../components/StudentRegistrationModal';
import { findSedeByCodigo, findFacultadByCodigo, findProgramaByCodigo } from '../data/univalleData';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showPolicyViewer, setShowPolicyViewer] = useState(false);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const { user, setUser } = useAuthStore();
  const { hasSelectedCharacter } = useAvatarStore();
  const navigate = useNavigate();

  // If user is already registered with student code, navigate to character setup or world
  useEffect(() => {
    if (user && user.codigoEstudiantil) {
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
      setNoticeMessage(null);
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;

      if (loggedUser) {
        const userRef = doc(db, 'users', loggedUser.uid);
        const userSnap = await getDoc(userRef);
        const docData = userSnap.exists() ? userSnap.data() : null;

        const isAccepted = Boolean(docData?.acceptedLaw1581);
        const acceptedDate = docData?.acceptedLaw1581Date;
        const isRegistered = Boolean(docData?.codigoEstudiantil);

        const sedeCode = docData?.sedeCodigo || docData?.sede;
        const facCode = docData?.facultadCodigo || docData?.facultad;
        const progCode = docData?.programaCodigo || docData?.programa;

        // Resolve details from local JSON files
        const sedeObj = findSedeByCodigo(sedeCode);
        const facultadObj = findFacultadByCodigo(facCode);
        const programaObj = findProgramaByCodigo(progCode);

        const userData: UserData = {
          uid: loggedUser.uid,
          name: loggedUser.displayName || 'Unknown',
          email: loggedUser.email || '',
          photoURL: loggedUser.photoURL || '',
          acceptedLaw1581: isAccepted,
          acceptedLaw1581Date: acceptedDate,
          codigoEstudiantil: docData?.codigoEstudiantil,
          nombresApellidos: docData?.nombresApellidos,
          sedeCodigo: sedeCode,
          sedeNombre: sedeObj ? sedeObj.nombre : (docData?.sedeNombre || ''),
          facultadCodigo: facCode,
          facultadNombre: facultadObj ? facultadObj.nombre : (docData?.facultadNombre || ''),
          programaCodigo: progCode,
          programaNombre: programaObj ? programaObj.nombre : (docData?.programaNombre || ''),
          isRegistrationComplete: isRegistered,
        };

        setUser(userData);

        if (!isRegistered) {
          // Open student registration directly (includes Ley 1581 consent at bottom)
          setShowRegistrationModal(true);
        } else {
          // Already registered: Character Setup or World
          if (docData?.nickname && docData?.avatarName) {
            useAvatarStore.getState().completeSetup(docData.nickname, docData.avatarName, docData.gender || 'female');
            navigate('/mundo');
          } else {
            useAvatarStore.getState().resetAvatar();
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

  const handleStudentRegistration = async (regData: StudentRegistrationData) => {
    if (!user) return;
    try {
      setSavingRegistration(true);
      const now = new Date().toISOString();
      const userRef = doc(db, 'users', user.uid);

      const updatePayload = {
        nombresApellidos: regData.nombresApellidos,
        email: regData.email,
        codigoEstudiantil: regData.codigoEstudiantil,
        sedeCodigo: regData.sedeCodigo,
        sedeNombre: regData.sedeNombre,
        facultadCodigo: regData.facultadCodigo,
        facultadNombre: regData.facultadNombre,
        programaCodigo: regData.programaCodigo,
        programaNombre: regData.programaNombre,
        acceptedLaw1581: true,
        acceptedLaw1581Date: regData.acceptedLaw1581Date || now,
        isRegistrationComplete: true,
      };

      await setDoc(userRef, updatePayload, { merge: true });

      const updatedUser: UserData = {
        ...user,
        ...updatePayload,
      };

      setUser(updatedUser);
      setShowRegistrationModal(false);

      // Verify if character setup is already present
      const userSnap = await getDoc(userRef);
      const data = userSnap.data();
      if (data && data.nickname && data.avatarName) {
        useAvatarStore.getState().completeSetup(data.nickname, data.avatarName, data.gender || 'female');
        navigate('/mundo');
      } else {
        useAvatarStore.getState().resetAvatar();
        navigate('/seleccion-personaje');
      }
    } catch (error) {
      console.error('Error al guardar registro estudiantil:', error);
      alert('Hubo un error al guardar tu registro estudiantil. Por favor inténtalo de nuevo.');
    } finally {
      setSavingRegistration(false);
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await auth.signOut();
      useAvatarStore.getState().resetAvatar();
      setUser(null);
      setShowRegistrationModal(false);
      setNoticeMessage('Para acceder al videojuego institucional Brillo en la Montaña, debes completar tu registro estudiantil y autorizar el uso institucional de tus datos.');
    } catch (error) {
      console.error('Error al cancelar registro:', error);
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
            Ingresa con tu cuenta institucional. Tus datos son de <strong>uso estrictamente institucional</strong> y <strong>no se divulgará tu información</strong>.
          </p>
        </header>

        {noticeMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5 text-left w-full animate-fade-in shadow-sm">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="leading-relaxed">{noticeMessage}</span>
          </div>
        )}

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
      <footer className="w-full max-w-md text-center text-slate-400 text-[11px] sm:text-xs tracking-wide leading-relaxed pt-6 pb-2 z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setShowPolicyViewer(true)}
          className="text-slate-500 hover:text-[#C8102E] underline underline-offset-4 decoration-slate-300 hover:decoration-[#C8102E] transition-colors mb-2 cursor-pointer font-medium"
        >
          Política de Tratamiento de Datos y No Divulgación (Ley 1581 de 2012)
        </button>
        <p>Desarrollado por Dirección de Desarrollo Estudiantil y Éxito Académico - DEXIA</p>
        <p className="mt-0.5 text-slate-400/80">© 2026 Universidad del Valle</p>
      </footer>

      {/* Read-only Modal for viewing the policy from footer */}
      <Law1581ConsentModal
        isOpen={showPolicyViewer}
        isReadOnly={true}
        onClose={() => setShowPolicyViewer(false)}
      />

      {/* Modal for First-time Student Registration (Includes Ley 1581 consent at bottom) */}
      <StudentRegistrationModal
        isOpen={showRegistrationModal || Boolean(user && !user.codigoEstudiantil)}
        user={user}
        onSubmit={handleStudentRegistration}
        onCancel={handleCancelRegistration}
        isSubmitting={savingRegistration}
      />
    </main>
  );
};

