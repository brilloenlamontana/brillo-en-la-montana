import { useEffect } from 'react';
import { hasMochilaItem, isBackpackActive } from '../../../constants/mission';
import { MOCHILA_ITEMS, type MochilaItemId } from '../../../constants/recogibles';
import { useProgressStore } from '../../../store/progressStore';
import { activateMochilaItem } from '../../../utils/mochilaActions';
import { MochilaItemIcon } from './MochilaItemIcon';

// Tecla de cada objeto: fija para que no cambie al conseguir otro.
const ITEM_KEYS: Record<MochilaItemId, string> = { gema: '1', soga: '2', insecticida: '3' };

// Acceso rápido abajo a la derecha: los objetos que ya tienes se usan con un clic (o tocándolos) o con su tecla.
// Un objeto gastado (la gema tras apagar al golem, el insecticida tras el último zumbador, la soga al final) desaparece.
// En celular sube para no tapar los botones de saltar y correr.
export function QuickItemBar({ raised }: { raised: boolean }) {
  const progress = useProgressStore((state) => state.progress);
  const active = isBackpackActive(progress);
  const owned = MOCHILA_ITEMS.filter((item) => hasMochilaItem(item.id, progress));
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
      className={`fixed right-[max(16px,env(safe-area-inset-right,16px))] z-30 flex gap-2 sm:gap-2.5 transition-all duration-200 ${
        raised
          ? 'bottom-[max(180px,calc(env(safe-area-inset-bottom,24px)+150px))]'
          : 'bottom-[max(16px,env(safe-area-inset-bottom,16px))]'
      }`}
    >
      {owned.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => activateMochilaItem(item.id)}
          title={`Usar ${item.name} (${ITEM_KEYS[item.id]})`}
          aria-label={`Usar ${item.name}`}
          className="relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#f4e4bc]/95 border-2 sm:border-[3px] border-[#5c3a21] shadow-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#f4d03f]"
        >
          <MochilaItemIcon id={item.id} className="w-7 h-7 sm:w-10 sm:h-10" />
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#5c3a21] text-[#f4d03f] text-[10px] sm:text-xs font-bold flex items-center justify-center border sm:border-2 border-[#f4e4bc]"
          >
            {ITEM_KEYS[item.id]}
          </span>
        </button>
      ))}
    </div>
  );
}
