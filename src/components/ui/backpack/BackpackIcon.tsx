// Mochila de cuero con solapa, hebilla dorada y bolsillo frontal; usa los mismos cafés y dorado de los modales del juego.
export function BackpackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5.2V4.4a3 3 0 0 1 6 0v.8" stroke="#5c3a21" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4.6 9.5 3.4 17.2M19.4 9.5l1.2 7.7" stroke="#5c3a21" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="4.5" y="5.2" width="15" height="16.3" rx="4.4" fill="#a0672c" stroke="#5c3a21" strokeWidth="1.4" />
      <path
        d="M4.5 10.6c0-3 2.4-5.4 5.4-5.4h4.2c3 0 5.4 2.4 5.4 5.4v.6H4.5z"
        fill="#7a4a1e"
        stroke="#5c3a21"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect x="10.6" y="9.7" width="2.8" height="2.7" rx="0.6" fill="#f4d03f" stroke="#5c3a21" strokeWidth="0.9" />
      <rect x="7.4" y="14.2" width="9.2" height="5.4" rx="1.8" fill="#8a5524" stroke="#5c3a21" strokeWidth="1.2" />
      <path d="M7.4 16.3h9.2" stroke="#5c3a21" strokeWidth="1" />
    </svg>
  );
}
