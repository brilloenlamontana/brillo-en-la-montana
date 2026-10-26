import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Toman los 3 objetos: han atravesado el bosque" and "Casa de la Enana (vista exterior)", from the scene schedule.
const RELATO = [
  'Duros combates y numerosas trampas naturales llevaron al fin a la salida del Bosque de la Oscuridad. A pesar de ser un ambiente más fresco que el pantano, el bosque resultó engañosamente duro: las plantas venenosas estaban por doquier, los duendes acechaban tras los árboles y los senderos eran casi imposibles de distinguir.',
  'Tus ojos cansados finalmente pueden distinguir los primeros pasos del sendero que asciende hacia la Cumbre de la Desesperación. En la falda de la montaña divisas una fogata cerca de una casa de piedra y las ruinas de un antiguo pueblo minero. La enana Hedrig atiende el fuego de espaldas.',
];

// Challenge 2 completed: goblins defeated, fed with safe fruits, and the mountain pass cleared with the map.
export function BosqueSuperadoDialog() {
  const isOpen = useDialogOpen(DIALOG.bosqueSuperado);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="¡Atravesaste el Bosque de la Oscuridad!" subtitle="Desafío 2 completado" paragraphs={RELATO}>
      <div className="flex justify-end">
        <ParchmentButton onClick={() => useUIStore.getState().closeDialog()}>Avanzar al Pueblo Minero</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
