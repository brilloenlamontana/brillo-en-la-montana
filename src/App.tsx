import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { WorldPage } from './pages/WorldPage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.config';
import { useAuthStore } from './store/authStore';
import './index.css';

const App: React.FC = () => {
  const { setAuthReady, setUser, isAuthReady } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Unknown',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        });
      } else {
        setUser(null);
      }
      setAuthReady(true);
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
        <Route path="/mundo" element={<WorldPage />} />
      </Routes>
    </Router>
  );
};

export default App;
