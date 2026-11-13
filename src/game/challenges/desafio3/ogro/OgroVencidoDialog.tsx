import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Le ganan el pulso al Ogro", from the scene schedule.
const RELATO = [
  'Con el guante de minero bien ajustado, tu brazo resiste el empuje del Ogro y, poco a poco, su enorme puño cede hasta golpear la mesa. ¡Le ganaste el pulso!',
  'Lejos de enfurecerse, el Ogro suelta una carcajada que retumba en la caverna y, con alegría, se aparta de la escalera para dejarte pasar.',
];

// The Ogre was beaten at arm wrestling: the stairs to the summit are free.
export function OgroVencidoDialog() {
  const isOpen = useDialogOpen(DIALOG.ogroVencido);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="¡Venciste al Ogro en el pulso!" subtitle="El guardián de la subida te deja pasar" paragraphs={RELATO} voice={['03_narrador_13']} onClose={() => useUIStore.getState().closeDialog()} />
  );
}
