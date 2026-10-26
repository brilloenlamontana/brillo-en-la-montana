import { useLenteActivo } from './lente';

// While looking through the elf's lens: the screen is seen through a round golden lens, with a reminder of what the
// colors mean. It never blocks clicks or taps.
export function LenteOverlay() {
  const active = useLenteActivo();
  if (!active) return null;

  return (
    <div className="absolute inset-0 z-1 pointer-events-none select-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at center, transparent 0, transparent 40vmin, rgba(30,20,6,0.35) 43vmin, rgba(20,12,4,0.8) 75vmin)' }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[84vmin] h-[84vmin] rounded-full"
        style={{ border: '0.9vmin solid #c9a227', boxShadow: '0 0 0 0.4vmin #5c3a21, inset 0 0 6vmin rgba(244,208,63,0.25)' }}
      />
      <p className="absolute left-1/2 -translate-x-1/2 bottom-[max(84px,calc(env(safe-area-inset-bottom,16px)+84px))] bg-[#f4e4bc]/95 text-[#5c3a21] border-2 border-[#5c3a21] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold shadow-lg w-max max-w-[calc(100vw-32px)] text-center">
        Lente revelador: <span className="text-amber-600">amarillas</span> = buenas · <span className="text-red-700">rojas</span> = venenosas
      </p>
    </div>
  );
}
