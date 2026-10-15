import React from 'react';
import { useWorldStore } from '../../store/worldStore';

// Tapa el mundo hasta que cargó todo y el renderer terminó de preparar los materiales (ver Warmup en WorldScene).
// Una vez listo no vuelve a aparecer.
export const LoadingScreen: React.FC = () => {
  const ready = useWorldStore((state) => state.ready);

  if (ready) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-slate-50 font-sans p-4 select-none">
      <h6 className="text-base sm:text-lg md:text-xl font-bold mb-6 text-center drop-shadow-md">
      {'Cargando...'}
      </h6>     
    </div>
  );
};
