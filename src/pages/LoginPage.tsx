import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase.config';
import { useAuthStore, type UserData } from '../store/authStore';
import { useAvatarStore } from '../store/avatarStore';
import { useNavigate } from 'react-router-dom';
import { Law1581ConsentModal } from '../components/Law1581ConsentModal';
import { StudentRegistrationModal, type StudentRegistrationData } from '../components/StudentRegistrationModal';
import { LoginLayout } from '../components/LoginLayout';
import { findSedeByCodigo, findFacultadByCodigo, findProgramaByCodigo } from '../data/univalleData';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showPolicyViewer, setShowPolicyViewer] = useState(false);
  const [savingRegistration, setSavingRegistration] = useState(false);

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
    } catch (error) {
      console.error('Error al cancelar registro:', error);
    }
  };

  return (
    <>
      <LoginLayout
        accessType="student"
        onSignIn={handleGoogleSignIn}
        loading={loading}
      />

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
    </>
  );
};

