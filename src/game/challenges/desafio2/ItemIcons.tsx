// Flat icons of the Challenge 2 backpack items, in the brown and gold of the backpack.

type IconProps = { className?: string };

export function EspadaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19.5 2.5 21.5 4.5 10 16l-2-2z" fill="#dfe8ef" stroke="#4a5a68" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M19.5 2.5 21.5 4.5" stroke="#9fb3c3" strokeWidth="0.9" />
      <path d="M5.2 12.6 11.4 18.8" stroke="#c9974f" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8.7 16.1 4.4 20.4" stroke="#5c3a21" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="3.9" cy="20.9" r="1.3" fill="#f4d03f" stroke="#5c3a21" strokeWidth="0.8" />
    </svg>
  );
}

export function LenteIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" fill="#bfe6f2" fillOpacity="0.7" stroke="#c9974f" strokeWidth="2.2" />
      <path d="M7.2 7.6a3.6 3.6 0 0 1 3-1.6" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14.8 14.8 20.6 20.6" stroke="#5c3a21" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function MapaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 5.5 8.5 3.5l7 2 5.5-2v15l-5.5 2-7-2L3 20.5z" fill="#f1dca7" stroke="#8a5a24" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8.5 3.5v15M15.5 5.5v15" stroke="#8a5a24" strokeWidth="0.9" />
      <path d="M5.5 15c2-1 3.5-3.5 6-3s3 3 6.5 1.5" stroke="#3f7a3a" strokeWidth="1.2" strokeDasharray="1.6 1.4" strokeLinecap="round" />
      <path d="m16.5 8 1.6 1.6M18.1 8l-1.6 1.6" stroke="#c8102e" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
