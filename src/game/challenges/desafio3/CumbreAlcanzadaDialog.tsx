import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from './dialogs';

// "Llegan a la cima de la cumbre", from the scene schedule.
const RELATO = [
  'Agotado y con las extremidades agarrotadas tras la larga escalada, llegas a la cima de la Cumbre de la Desesperación. Para tu sorpresa, el paisaje, aunque desolado, muestra que alguna vez hubo un pueblo habitando el lugar.',
  'Encuentras viejos edificios derruidos, erosionados por los fuertes y helados vientos, rodeados de lo que alguna vez fueron jardines, en los que aún se erigen los troncos congelados de grandes árboles ya sin hojas y pedazos de columnas que sostuvieron majestuosos arcos.',
  'Al fondo del ancho camino se observa un alto edificio con una plaza enfrente: de su interior brota un resplandor verde, muy brillante, que te resulta agradable y familiar.',
];

// Challenge 3 completed: the player came out of the tunnels onto the summit. Points them to the sanctuary.
export function CumbreAlcanzadaDialog() {
  const isOpen = useDialogOpen(DIALOG.cumbre);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="¡Llegaste a la Cumbre de la Desolación!" subtitle="Desafío 3 completado · tu vida se recuperó al 100 %" paragraphs={RELATO} voice={['03_narrador_14']}>
      <div className="flex justify-end">
        <ParchmentButton onClick={() => useUIStore.getState().closeDialog()}>Seguir hacia el santuario</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
