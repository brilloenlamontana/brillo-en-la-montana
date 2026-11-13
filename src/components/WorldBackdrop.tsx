// The backdrop of the screens outside the game (sign-in, registration, access denied): a view of the game's own world
// rendered from Map.blend at dusk (the roofs of the Villa de Boj and the mountains, as the world is before the chalice
// is back: no glow on the summit), under a veil of the game's dark wood so that what stands on it reads well. It drifts
// very slowly, and stays still for whoever asked the system for less motion (see index.css).
export function WorldBackdrop() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-madera-900 pointer-events-none" aria-hidden="true">
      <img src="/sprites-2d/fondo-inicio.jpg" alt="" className="absolute inset-0 h-full w-full object-cover animate-fondo-deriva" draggable={false} />
      {/* Dark wood at the top and the bottom, and a vignette. */}
      <div className="absolute inset-0 bg-gradient-to-b from-madera-900/70 via-madera-900/20 to-madera-900/85" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(26, 14, 8, 0.55) 100%)' }} />
    </div>
  );
}
