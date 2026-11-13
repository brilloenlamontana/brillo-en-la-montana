import { terminarLlegada, useLlegada } from '@/game/challenges/llegada';
import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { LLEGADA } from './llegadaHedrig';

// "Toman los 3 objetos: han atravesado el bosque" and "Casa de la Enana (vista exterior)", from the scene schedule: told
// on arriving at Hedrig's house, once the forest was crossed. As it ends she comes out of her house (Hedrig.tsx).
const HISTORIA = [
  'Duros combates y numerosas trampas naturales llevaron al fin a la salida del Bosque de la Oscuridad. A pesar de ser un ambiente más fresco que el pantano, el bosque resultó engañosamente duro: las plantas venenosas estaban por doquier, los duendes acechaban tras los árboles y los senderos eran casi imposibles de distinguir.',
  'Tus ojos cansados finalmente pueden distinguir los primeros pasos del sendero que asciende hacia la Cumbre de la Desesperación. En la falda de la montaña divisas una fogata cerca de una casa de piedra y las ruinas de un antiguo pueblo minero.',
];

export function LlegadaHedrigDialog() {
  useLlegada(LLEGADA);
  const isOpen = useDialogOpen(DIALOG.llegada);
  if (!isOpen) return null;

  return <ParchmentDialog title="El pueblo minero" subtitle="Al pie de la Cumbre de la Desolación" paragraphs={HISTORIA} voice={['03_narrador_00']} onDone={() => terminarLlegada(LLEGADA.id)} />;
}
