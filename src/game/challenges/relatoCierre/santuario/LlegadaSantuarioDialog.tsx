import { terminarLlegada, useLlegada } from '@/game/challenges/llegada';
import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { LLEGADA } from './llegadaSantuario';

// "Llegan a la cima de la cumbre", from the scene schedule: told on arriving at the sanctuary, once the summit was
// reached. As it ends the dryad comes out to meet the player (Driada.tsx).
const HISTORIA = [
  'Agotado y con las extremidades agarrotadas tras la larga escalada, llegas a la cima de la Cumbre de la Desesperación. Para tu sorpresa, el paisaje, aunque desolado, muestra que alguna vez hubo un pueblo habitando el lugar.',
  'Encuentras viejos edificios derruidos, erosionados por los fuertes y helados vientos, rodeados de lo que alguna vez fueron jardines, en los que aún se erigen los troncos congelados de grandes árboles ya sin hojas y pedazos de columnas que sostuvieron majestuosos arcos.',
  'Al fondo del ancho camino se observa un alto edificio con una plaza enfrente: de su interior brota un resplandor verde, muy brillante, que te resulta agradable y familiar.',
];

export function LlegadaSantuarioDialog() {
  useLlegada(LLEGADA);
  const isOpen = useDialogOpen(DIALOG.llegada);
  if (!isOpen) return null;

  return <ParchmentDialog title="La Cumbre de la Desolación" subtitle="Camino al santuario" paragraphs={HISTORIA} voice={['04_narrador_00']} onDone={() => terminarLlegada(LLEGADA.id)} />;
}
