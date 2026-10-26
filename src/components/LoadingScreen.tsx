// Full-screen cover while the session or the world loads.
export function LoadingScreen({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-slate-50 font-sans p-4 select-none">
      <p role="status" className="text-base sm:text-lg md:text-xl font-bold text-center drop-shadow-md">
        {message}
      </p>
    </div>
  );
}
