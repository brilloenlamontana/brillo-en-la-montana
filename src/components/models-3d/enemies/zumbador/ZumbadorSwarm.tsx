import React from 'react';
import { ZUMBADOR_COUNT } from '../../../../store/enemyStore';
import { Zumbador } from './Zumbador';

export const ZumbadorSwarm: React.FC = () => {
  return (
    <>
      {Array.from({ length: ZUMBADOR_COUNT }, (_, i) => (
        <Zumbador key={`zumbador-${i}`} index={i} scale={10} />
      ))}
    </>
  );
};
