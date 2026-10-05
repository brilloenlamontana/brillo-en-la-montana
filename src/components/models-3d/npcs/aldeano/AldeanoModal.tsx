import React from 'react';
import { useUIStore } from '../../../../store/uiStore';
import { saveProgressToDB } from '../../../../services/progressService';

export const AldeanoModal: React.FC = () => {
  const { isAldeanoModalOpen, setAldeanoModalOpen } = useUIStore();

  if (!isAldeanoModalOpen) return null;

  // Se guarda en Firestore para que la decisión sobreviva a recargar la página.
  const handleYes = () => {
    saveProgressToDB(undefined, 'aldeanoHelp', 'accepted');
    setAldeanoModalOpen(false);
  };

  const handleNo = () => {
    saveProgressToDB(undefined, 'aldeanoHelp', 'rejected');
    setAldeanoModalOpen(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90%',
          maxHeight: '90%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img
          src="/sprites-2d/aseets/preguntas-aldeanos.png"
          alt="Pregunta del Aldeano"
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
          }}
        />
        
        {/* Buttons overlay */}
        <div style={{ position: 'absolute', bottom: '20%', display: 'flex', gap: '40px' }}>
          <button 
            onClick={handleYes}
            style={{ 
              padding: '10px 40px', 
              fontSize: '1.8rem', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              borderRadius: '8px', 
              background: '#5c3a21', // Wood brown
              color: '#f4d03f', // Gold/Yellowish text for "Yes"
              border: '2px solid #3e2723',
              boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
              textShadow: '1px 1px 2px black'
            }}
            className="hover:scale-105 transition-transform"
          >
            SÍ
          </button>
          <button 
            onClick={handleNo}
            style={{ 
              padding: '10px 40px', 
              fontSize: '1.8rem', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              borderRadius: '8px', 
              background: '#5c3a21', // Same wood brown
              color: '#ff6b6b', // Reddish text for "No"
              border: '2px solid #3e2723',
              boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
              textShadow: '1px 1px 2px black'
            }}
            className="hover:scale-105 transition-transform"
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
};
