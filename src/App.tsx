import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { WorldPage } from './pages/WorldPage';
import { CharacterSelectionScreen } from './components/CharacterSelectionScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.config';
import { useAuthStore, type UserData } from './store/authStore';
import { useAvatarStore } from './store/avatarStore';
import { findSedeByCodigo, findFacultadByCodigo, findProgramaByCodigo } from './data/univalleData';
import './index.css';

const App: React.FC = () => {
  const { setAuthReady, setUser, isAuthReady } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: UserData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Unknown',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          acceptedLaw1581: false,
        };

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const sedeCode = data.sedeCodigo || data.sede;
            const facCode = data.facultadCodigo || data.facultad;
            const progCode = data.programaCodigo || data.programa;

            // Look up directly from local JSON files
            const sedeObj = findSedeByCodigo(sedeCode);
            const facultadObj = findFacultadByCodigo(facCode);
            const programaObj = findProgramaByCodigo(progCode);

            userData.acceptedLaw1581 = !!data.acceptedLaw1581;
            userData.acceptedLaw1581Date = data.acceptedLaw1581Date;
            userData.codigoEstudiantil = data.codigoEstudiantil;
            userData.nombresApellidos = data.nombresApellidos;
            userData.sedeCodigo = sedeCode;
            userData.sedeNombre = sedeObj ? sedeObj.nombre : (data.sedeNombre || '');
            userData.facultadCodigo = facCode;
            userData.facultadNombre = facultadObj ? facultadObj.nombre : (data.facultadNombre || '');
            userData.programaCodigo = progCode;
            userData.programaNombre = programaObj ? programaObj.nombre : (data.programaNombre || '');
            userData.isRegistrationComplete = Boolean(data.codigoEstudiantil);

            if (data.nickname && data.avatarName) {
              useAvatarStore.getState().completeSetup(data.nickname, data.avatarName, data.gender || 'female');
            } else {
              useAvatarStore.getState().resetAvatar();
            }
          } else {
            userData.acceptedLaw1581 = false;
            useAvatarStore.getState().resetAvatar();
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
          userData.acceptedLaw1581 = false;
          useAvatarStore.getState().resetAvatar();
        } finally {
          setUser(userData);
          setAuthReady(true);
        }
      } else {
        useAvatarStore.getState().resetAvatar();
        setUser(null);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  if (!isAuthReady) {
    return <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/seleccion-personaje" element={<CharacterSelectionScreen />} />
        <Route path="/mundo" element={<WorldPage />} />
      </Routes>
    </Router>
  );
};

export default App;
