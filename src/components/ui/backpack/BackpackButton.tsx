import { useCallback, useEffect, useRef } from 'react';
import { hasMochilaItem, MOCHILA_ITEMS } from '../../../constants/recogibles';
import { useProgressStore } from '../../../store/progressStore';
import { useToastStore } from '../../../store/toastStore';
import { useUIStore } from '../../../store/uiStore';
import { BackpackIcon } from './BackpackIcon';
import { BackpackPanel } from './BackpackPanel';

// Aparece al lado del perfil cuando Imeri activa la mochila (después de hablar con ella). La tecla B la abre y cierra,
// útil para usar la soga rápido al quedar atrapado en un pozo.
export function BackpackButton() {
  const active = useProgressStore((state) => state.progress.interactedWithImeri === true);
  const collected = useProgressStore((state) => state.progress.collectedItems ?? []);
  const open = useUIStore((state) => state.isBackpackOpen);
  const setOpen = useUIStore((state) => state.setBackpackOpen);
  const close = useCallback(() => setOpen(false), [setOpen]);

  const ownedCount = MOCHILA_ITEMS.filter((item) => hasMochilaItem(item.id, collected)).length;
  const hasInsecticida = hasMochilaItem('insecticida', collected);

  // Aviso solo cuando el insecticida se prepara en esta partida (al recoger la quinta poción), no al cargar el progreso.
  const hadInsecticida = useRef(hasInsecticida);
  useEffect(() => {
    if (hasInsecticida && !hadInsecticida.current) {
      useToastStore.getState().showToast('🧪 Con las 5 pociones preparaste el insecticida. Ya está en tu mochila.');
    }
    hadInsecticida.current = hasInsecticida;
  }, [hasInsecticida]);

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'b') return;
      const { isBackpackOpen, setBackpackOpen } = useUIStore.getState();
      setBackpackOpen(!isBackpackOpen);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  if (!active) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Abrir mochila (B)"
        aria-label={`Abrir mochila (${ownedCount} de ${MOCHILA_ITEMS.length} objetos)`}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
      >
        <BackpackIcon className="w-7 h-7" />
        {ownedCount > 0 && (
          <span
            className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#5c3a21] border-2 border-white text-[9px] leading-none font-bold text-[#f4d03f] flex items-center justify-center"
            aria-hidden="true"
          >
            {ownedCount}
          </span>
        )}
      </button>
      <div className="w-px h-5 bg-slate-200" />
      {open && <BackpackPanel onClose={close} />}
    </>
  );
}
