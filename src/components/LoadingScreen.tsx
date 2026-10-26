// Full-screen cover while the session or the world loads. With `percent` it also shows a progress bar.
export function LoadingScreen({ message = 'Cargando...', percent }: { message?: string; percent?: number }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-50 font-sans p-4 select-none">
      <p role="status" className="text-base sm:text-lg md:text-xl font-bold text-center drop-shadow-md">
        {message}
      </p>
      {percent !== undefined && (
        <div
          className="w-[min(320px,80vw)] h-2.5 rounded-full bg-white/15 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-amber-400 transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
