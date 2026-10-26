import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Toman los 3 objetos: han atravesado el pantano" and "Casa del Elfo (vista exterior)", from the scene schedule.
const RELATO = [
  'Después de varios días de miserables caminatas en medio del lodo, logras llegar al final del Pantano de la Tristeza. A pesar de la prisa por terminar el viaje, no logras sacudirte la sensación pesada de que es mucho más difícil de lo esperado y más retador de lo que te dijeron en el pueblo.',
  'A lo lejos se ve el inicio del bosque y un punto de luz te trae alegría: una llama anaranjada te invita a acercarte. Al hacerlo descubres, asombrado, una casa entera suspendida de la copa de un árbol. A través de la ventana se ve pasar una silueta alargada que se asoma.',
];

// Challenge 1 completed: the golem is off and the zumbadores are gone. Points the player to the elf's house.
export function PantanoSuperadoDialog() {
  const isOpen = useDialogOpen(DIALOG.pantanoSuperado);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="¡Atravesaste el Pantano de la Tristeza!" subtitle="Desafío 1 completado" paragraphs={RELATO}>
      <div className="flex justify-end">
        <ParchmentButton onClick={() => useUIStore.getState().closeDialog()}>Seguir hacia el bosque</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
