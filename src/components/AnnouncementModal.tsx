import React, { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { saveProgressToDB } from '../services/progressService';

export const AnnouncementModal: React.FC = () => {
  const { isAnnouncementOpen, setAnnouncementOpen } = useUIStore();

  useEffect(() => {
    if (isAnnouncementOpen) {
      saveProgressToDB(undefined, 'openedMayorLetter', true);
    }
  }, [isAnnouncementOpen]);

  if (!isAnnouncementOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100, // Make sure it's above everything
      }}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90%',
          maxHeight: '90%',
        }}
      >
        <button
          onClick={() => setAnnouncementOpen(false)}
          style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '2rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            zIndex: 10,
          }}
          className="hover:scale-110 transition-transform"
        >
          &times;
        </button>
        <img
          src="/sprites-2d/aseets-2d/mayor-announcement.png"
          alt="Mayor Announcement"
          style={{
            maxWidth: '100%',
            maxHeight: '90vh',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    </div>
  );
};
