import type { MochilaItemId } from '../../../constants/recogibles';

// Iconos planos de los objetos de la mochila para la barra de acceso rápido; mismos cafés y dorado de la mochila.
export function MochilaItemIcon({ id, className }: { id: MochilaItemId; className?: string }) {
  if (id === 'gema') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4.5h10l4 5-9 11-9-11z" fill="#3b7bea" stroke="#1d3f8a" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M3 9.5h18M7 4.5l2.6 5L12 20.5l2.4-11 2.6-5M9.6 9.5 12 4.5l2.4 5" stroke="#1d3f8a" strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M8 6.2 6 9" stroke="#bcd5ff" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'soga') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <ellipse cx="12" cy="11" rx="8.5" ry="5.5" stroke="#8a5a24" strokeWidth="2.4" />
        <ellipse cx="12" cy="11" rx="5.6" ry="3.4" stroke="#c9974f" strokeWidth="2.2" />
        <ellipse cx="12" cy="11" rx="2.8" ry="1.6" stroke="#8a5a24" strokeWidth="1.8" />
        <path d="M18.5 14.5c.6 2 .2 4-1 5.5" stroke="#c9974f" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9.5" y="2.5" width="5" height="3.2" rx="0.8" fill="#2b2b2b" />
      <path d="M14.5 3.6h3.2M17.7 3.6l2 -1M17.7 3.6l2.2 .4M17.7 3.6l2 1.4" stroke="#7fd36b" strokeWidth="0.9" strokeLinecap="round" />
      <rect x="10.8" y="5.7" width="2.4" height="2" fill="#5c3a21" />
      <rect x="6.8" y="7.7" width="10.4" height="14" rx="3" fill="#e9f2ec" stroke="#5c3a21" strokeWidth="1.2" />
      <rect x="7.4" y="12" width="9.2" height="9" rx="2.4" fill="#a6e05a" />
      <path d="M7.4 14.4h9.2" stroke="#f4f9e8" strokeWidth="1.2" />
    </svg>
  );
}
