import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { LoginPage } from '@/pages/LoginPage';
import { useAuthStore } from '@/store/authStore';
import { useAuthSession } from './useAuthSession';

// Loaded on demand: three.js, Rapier and the models only download when entering the world, and the admin
// dashboard never weighs on players.
const CharacterSelectionPage = lazy(() => import('@/pages/CharacterSelectionPage'));
const WorldPage = lazy(() => import('@/pages/WorldPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));

export function App() {
  useAuthSession();
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  if (!isAuthReady) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/seleccion-personaje" element={<CharacterSelectionPage />} />
          <Route path="/mundo" element={<WorldPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
