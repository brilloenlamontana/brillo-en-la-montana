import React from 'react';
import { useAvatarStore } from '../../../store/avatarStore';

export const HealthUI: React.FC = () => {
  const { health, maxHealth } = useAvatarStore();
  
  // Calculate percentage for the health bar
  const healthPercentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  
  // Choose color based on health percentage
  let healthColor = '#4CAF50'; // Green
  if (healthPercentage <= 50) healthColor = '#FFC107'; // Yellow
  if (healthPercentage <= 25) healthColor = '#F44336'; // Red

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        pointerEvents: 'none', // Allow clicking through
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '1px 1px 2px black' }}>
          HP
        </span>
        
        <div
          style={{
            width: '200px',
            height: '20px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid #222',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${healthPercentage}%`,
              height: '100%',
              background: healthColor,
              transition: 'width 0.3s ease-in-out, background-color 0.3s ease-in-out',
            }}
          />
        </div>
        
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', minWidth: '40px', textAlign: 'right' }}>
          {Math.ceil(health)}
        </span>
      </div>
    </div>
  );
};
