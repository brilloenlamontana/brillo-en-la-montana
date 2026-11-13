import React from 'react';
import { WorldBackdrop } from '@/components/WorldBackdrop';

interface LoginLayoutProps {
  onSignIn: () => void | Promise<void>;
  loading?: boolean;
  errorMessage?: string | null;
  children?: React.ReactNode;
}

export const LoginLayout: React.FC<LoginLayoutProps> = ({
  onSignIn,
  loading = false,
  errorMessage = null,
  children,
}) => {
  return (
    <main className="min-h-[100dvh] w-full bg-madera-900 flex flex-col justify-between items-center px-4 py-6 sm:py-10 relative overflow-x-hidden select-none">
      <WorldBackdrop />

      {/* Top Spacer */}
      <div className="h-2 sm:h-6 relative z-10" />

      {/* Login Card */}
      <section className="w-full max-w-[420px] sm:max-w-[440px] bg-papel-100 border-[3px] border-madera-600 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative rounded-3xl py-10 px-8 sm:py-12 sm:px-10 flex flex-col items-center text-center z-10 my-auto">
        {/* Univalle Emblem Box */}
        <div className="p-3.5 bg-papel-200/90 rounded-2xl border border-papel-300 mb-6 shadow-sm flex items-center justify-center">
          <img 
            src="/univalle.svg" 
            alt="Universidad del Valle" 
            className="w-20 sm:w-22 h-auto object-contain" 
          />
        </div>

        {/* Institutional Pill Badge */}
        <span className="px-3.5 py-1.5 rounded-full bg-papel-300/80 text-madera-600 text-[11px] sm:text-xs font-bold tracking-wider uppercase mb-3.5">
          Acceso Institucional
        </span>

        {/* Game Title (strictly two lines on all screens) */}
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-madera-800 tracking-tight mb-8 sm:mb-9 flex flex-col items-center leading-tight">
          <span>Brillo en la</span>
          <span className="text-musgo-700">Montaña</span>
        </h1>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-papel-200 border border-papel-400 text-carmesi text-xs text-left w-full flex items-start gap-2">
            <svg className="w-4 h-4 text-carmesi flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Institutional Google Sign In Button */}
        <button 
          onClick={onSignIn}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 bg-madera-600 hover:bg-madera-700 text-oro-400 font-bold border-2 border-madera-800 shadow-lg shadow-madera-900/40 active:scale-[0.98] transition-all text-sm sm:text-[15px] cursor-pointer disabled:opacity-60"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
          </svg>
          <span>{loading ? 'Verificando credenciales...' : 'Iniciar Sesión con Cuenta Institucional'}</span>
        </button>
      </section>

      {/* Institutional Footer */}
      <footer className="w-full max-w-md text-center text-papel-200 text-[11px] sm:text-xs tracking-wide leading-relaxed pt-6 pb-2 z-10 relative flex flex-col items-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <p className="text-papel-200">Desarrollado por Dirección de Desarrollo Estudiantil y Éxito Académico - DEXIA</p>
        <p className="text-[10px] text-papel-300 mt-1">© 2026 Universidad del Valle</p>
      </footer>

      {children}
    </main>
  );
};
