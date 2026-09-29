import React, { useMemo } from 'react';
import { Zumbador } from './Zumbador';

export const ZumbadorSwarm: React.FC = () => {
  // Use useMemo so positions are only calculated once and don't re-roll on every render
  const swarmPositions = useMemo(() => {
    return Array.from({ length: 10 }).map(() => ({
      x: 42 + (Math.random() * 8 - 4),
      y: 2 + Math.random() * 2,
      z: -35 + (Math.random() * 8 - 4),
    }));
  }, []);

  return (
    <>
      {swarmPositions.map((pos, i) => (
        <Zumbador 
          key={`zumbador-${i}`} 
          position={[pos.x, pos.y, pos.z]} 
          rotation-y={-Math.PI} 
          scale={10} 
        />
      ))}
    </>
  );
};
