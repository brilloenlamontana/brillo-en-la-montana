import React, { useState } from 'react';
import { useProgress } from '@react-three/drei';

export const LoadingScreen: React.FC = () => {
  const { progress, active } = useProgress();
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Las cargas diferidas posteriores (p. ej. el interior de la casa de Imeri) no deben volver a tapar el mundo.
  if (!initialLoadDone && !active && progress === 100) setInitialLoadDone(true);

  if (!active || initialLoadDone) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: '#0f172a',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#f8fafc',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        Cargando Mundo...
      </h2>
      
      <div style={{ 
        width: '300px', 
        height: '24px', 
        backgroundColor: '#334155', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: '#3b82f6',
          backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
          backgroundSize: '1rem 1rem',
          transition: 'width 0.3s ease-out'
        }} />
      </div>
      
      <p style={{ marginTop: '15px', fontSize: '1.25rem', fontWeight: '500' }}>
        {Math.round(progress)}%
      </p>
    </div>
  );
};
