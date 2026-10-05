import { useEffect } from 'react';
import { hasMochilaItem, MOCHILA_ITEMS, type MochilaItemId } from '../../../constants/recogibles';
import { useProgressStore } from '../../../store/progressStore';
import { activateMochilaItem } from '../../../utils/mochilaActions';
import { MochilaItemIcon } from './MochilaItemIcon';

// Tecla de cada objeto: fija para que no cambie al conseguir otro.
const ITEM_KEYS: Record<MochilaItemId, string> = { gema: '1', soga: '2', insecticida: '3' };

// Acceso rápido abajo a la derecha: los objetos que ya tienes se usan con un clic (o tocándolos) o con su tecla.
// En celular sube para no tapar los botones de saltar y correr.
export function QuickItemBar({ raised }: { raised: boolean }) {
  const active = useProgressStore((state) => state.progress.interactedWithImeri === true);
  const collected = useProgressStore((state) => state.progress.collectedItems ?? []);
  const owned = MOCHILA_ITEMS.filter((item) => hasMochilaItem(item.id, collected));
  const ownedKey = owned.map((item) => item.id).join(',');

  useEffect(() => {
    if (!active) return;
    const ownedIds = ownedKey.split(',');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const item = MOCHILA_ITEMS.find((candidate) => ITEM_KEYS[candidate.id] === event.key);
      if (item && ownedIds.includes(item.id)) activateMochilaItem(item.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, ownedKey]);

  if (!active || owned.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 'max(24px, env(safe-area-inset-right, 24px))',
        bottom: raised ? 'max(190px, calc(env(safe-area-inset-bottom, 30px) + 160px))' : 'max(24px, env(safe-area-inset-bottom, 24px))',
        zIndex: 30,
        display: 'flex',
        gap: '10px',
      }}
    >
      {owned.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => activateMochilaItem(item.id)}
          title={`Usar ${item.name} (${ITEM_KEYS[item.id]})`}
          aria-label={`Usar ${item.name}`}
          className="relative flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#f4d03f]"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '14px',
            background: 'rgba(244,228,188,0.92)',
            border: '3px solid #5c3a21',
            boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
          }}
        >
          <MochilaItemIcon id={item.id} className="w-10 h-10" />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              width: '22px',
              height: '22px',
              borderRadius: '6px',
              background: '#5c3a21',
              color: '#f4d03f',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #f4e4bc',
            }}
          >
            {ITEM_KEYS[item.id]}
          </span>
        </button>
      ))}
    </div>
  );
}
