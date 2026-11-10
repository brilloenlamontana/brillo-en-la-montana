import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Acertijo 2 — Una lucecita entre los árboles", from the scene schedule: the light was a call for help.
const AGRADECIMIENTO = [
  'La espada élfica corta las zarzas de un solo tajo y la lucecita que parpadeaba entre los árboles se enciende con fuerza: era un hada, atrapada desde hacía días en la trampa de espinas de los duendes.',
  '«Algo dentro de ti supo que mi luz era un pedido de ayuda, y aun así pudiste haber seguido de largo. Gracias, aventurero: pocos se desvían de su camino por alguien a quien no conocen».',
  '«Toma mi amuleto, está sobre el atril de raíces. Allá arriba, en la cumbre, el frío y la tristeza son grandes: que su luz te recuerde que no caminas solo».',
];

// The fairy freed from the bramble trap thanks the player and offers her amulet (Bonus 2).
export function HadaDialog() {
  const isOpen = useDialogOpen(DIALOG.hada);
  const completado = useProgressStore((state) => state.progress.bono2Completado);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="El hada del claro" subtitle="Bono 2 · Una lucecita entre los árboles" paragraphs={AGRADECIMIENTO}>
      <div className="flex justify-end">
        <ParchmentButton onClick={() => useUIStore.getState().closeDialog()}>{completado ? 'Hasta pronto' : 'Recoger el amuleto'}</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
