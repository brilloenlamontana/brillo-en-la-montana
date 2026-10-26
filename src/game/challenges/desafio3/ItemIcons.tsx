// Flat icons of the Challenge 3 backpack items, in the brown and gold of the backpack.

type IconProps = { className?: string };

export function GuanteIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 21v-6.5L4.6 11.2a1.5 1.5 0 0 1 2.3-1.9L8 10.6V5a1.4 1.4 0 0 1 2.8 0v4.5V3.6a1.4 1.4 0 0 1 2.8 0v5.9V4.6a1.4 1.4 0 0 1 2.8 0v5.4-3.2a1.4 1.4 0 0 1 2.8 0V15c0 2.6-1.7 4.6-4 5.2V21z"
        fill="#c9974f"
        stroke="#5c3a21"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M7 18.2h10.4" stroke="#5c3a21" strokeWidth="1.6" />
    </svg>
  );
}

export function BrujulaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12.5" r="8.5" fill="#f1dca7" stroke="#8a5a24" strokeWidth="2" />
      <circle cx="12" cy="3.2" r="1.3" fill="#c9974f" stroke="#5c3a21" strokeWidth="0.8" />
      <path d="M12 6.8 14.2 12.5H9.8z" fill="#c0392b" />
      <path d="M12 18.2 9.8 12.5h4.4z" fill="#4a5a68" />
      <circle cx="12" cy="12.5" r="1.1" fill="#f4d03f" stroke="#5c3a21" strokeWidth="0.6" />
    </svg>
  );
}

export function MunecaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 21l1.4-7.5h5.2L16 21z" fill="#b5523b" stroke="#5c3a21" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M9.4 14.2 5.8 16.8M14.6 14.2l3.6 2.6" stroke="#e8c39e" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8.6" r="4.2" fill="#f0d2b0" stroke="#5c3a21" strokeWidth="1.1" />
      <path d="M7.9 8.2c.4-2.9 2-4.4 4.1-4.4s3.7 1.5 4.1 4.4c-1.4-.9-2.6-1.8-4.1-2.3-1.5.5-2.7 1.4-4.1 2.3z" fill="#8a5a24" />
      <circle cx="10.6" cy="9.2" r="0.6" fill="#3d2414" />
      <circle cx="13.4" cy="9.2" r="0.6" fill="#3d2414" />
      <path d="M10.8 11.1c.7.5 1.7.5 2.4 0" stroke="#3d2414" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}
