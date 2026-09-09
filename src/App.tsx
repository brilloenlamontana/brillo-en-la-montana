import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { WorldPage } from './pages/WorldPage';
import { CharacterSelectionScreen } from './components/CharacterSelectionScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase.config';
import { useAuthStore } from './store/authStore';
import { useAvatarStore } from './store/avatarStore';
import './index.css';

const App: React.FC = () => {
  const { setAuthReady, setUser, isAuthReady } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Unknown',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        };

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.nickname && data.avatarName) {
              useAvatarStore.getState().completeSetup(data.nickname, data.avatarName, data.gender || 'female');
            } else {
              useAvatarStore.getState().resetAvatar();
            }
          } else {
            useAvatarStore.getState().resetAvatar();
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
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
