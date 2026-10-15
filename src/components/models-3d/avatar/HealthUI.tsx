import React from 'react';
import { useAvatarStore } from '../../../store/avatarStore';

export const HealthUI: React.FC = () => {
  const { health, maxHealth } = useAvatarStore();

  // Porcentaje para la barra de vida
  const healthPercentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));

  // Color de la barra según porcentaje
  const healthColor =
    healthPercentage <= 25
      ? 'bg-red-500'
      : healthPercentage <= 50
      ? 'bg-amber-400'
      : 'bg-emerald-500';

  return (
    <div className="absolute top-[max(12px,env(safe-area-inset-top,12px))] left-[max(12px,env(safe-area-inset-left,12px))] z-2 flex flex-col pointer-events-none select-none">
      <div className="flex items-center gap-2 sm:gap-2.5 bg-white/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-md">
        <div className="relative w-[130px] sm:w-[200px] h-4 sm:h-5 bg-black/50 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-[#222]">
          <div
            className={`h-full transition-all duration-300 ease-in-out ${healthColor}`}
            style={{ width: `${healthPercentage}%` }}
          />
        </div>

        <span className="text-slate-800 font-bold text-xs sm:text-base min-w-[32px] sm:min-w-[40px] text-right">
          {Math.ceil(health)}
        </span>
      </div>
    </div>
  );
};
