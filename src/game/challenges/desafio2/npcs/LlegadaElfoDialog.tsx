import { terminarLlegada, useLlegada } from '@/game/challenges/llegada';
import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { LLEGADA } from './llegadaElfo';

// "Toman los 3 objetos: han atravesado el pantano" and "Casa del Elfo (vista exterior)", from the scene schedule: told
// on arriving at the giant tree, once the swamp was crossed. As it ends the elf comes down his stairs (Elfo.tsx).
const HISTORIA = [
  'Después de varios días de miserables caminatas en medio del lodo, logras llegar al final del Pantano de la Tristeza. A pesar de la prisa por terminar el viaje, no logras sacudirte la sensación pesada de que es mucho más difícil de lo esperado y más retador de lo que te dijeron en el pueblo.',
  'A lo lejos se ve el inicio del bosque y un punto de luz te trae alegría: una llama anaranjada te invita a acercarte. Al hacerlo descubres, asombrado, una casa entera suspendida de la copa de un árbol. A través de la ventana se ve pasar una silueta alargada que se asoma.',
];

export function LlegadaElfoDialog() {
  useLlegada(LLEGADA);
  const isOpen = useDialogOpen(DIALOG.llegada);
  if (!isOpen) return null;

  return <ParchmentDialog title="El árbol gigante" subtitle="A la entrada del Bosque de la Oscuridad" paragraphs={HISTORIA} voice={['02_narrador_00']} onDone={() => terminarLlegada(LLEGADA.id)} />;
}
