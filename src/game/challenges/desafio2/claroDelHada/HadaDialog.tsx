import { EXTRA_STAR_TOAST, EXTRA_STAR_VOICE } from '@/game/challenges/bonos';
import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Acertijo 2 — Una lucecita entre los árboles", from the scene schedule: the light was a call for help. What the
// fairy says while she is rescued and gives her amulet is heard in the scenes themselves (ClaroHud): here are only the
// closing of the bonus and her words for whoever comes back.
const AMULETO = ['El amuleto es tibio, y dentro de la piedra late una luz pequeña, igual a la que viste parpadear desde el sendero.', EXTRA_STAR_TOAST];

const DESPEDIDA = [
  '«¡Sigues aquí! El bosque ya no me da miedo: desde arriba veo venir a los duendes de lejos», dice el hada, sin dejar de revolotear.',
  '«Ve tranquilo hacia la montaña. Mi amuleto te acompaña, y yo cuidaré este claro para quien venga detrás de ti».',
];

const close = () => useUIStore.getState().closeDialog();

// The fairy of the clearing (Bonus 2): the bonus is told once her amulet hangs from the player's neck, and she has a
// few words for whoever comes back.
export function HadaDialog() {
  const dialog = useUIStore((state) => state.dialog);

  if (dialog === DIALOG.hadaAmuleto) {
    return <ParchmentDialog title="¡Bono 2 completado!" subtitle="Recibiste el amuleto del hada" paragraphs={AMULETO} voice={['02_narrador_13', EXTRA_STAR_VOICE]} onClose={close} />;
  }
  if (dialog !== DIALOG.hada) return null;

  return <ParchmentDialog title="El hada del claro" subtitle="Bono 2 · Una lucecita entre los árboles" paragraphs={DESPEDIDA} voice={['02_hada_03', '02_narrador_14', '02_hada_04']} onClose={close} />;
}
