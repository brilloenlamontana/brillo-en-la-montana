import { CinematicaOverlay } from './cinematica/CinematicaOverlay';
import { RelatoCierreSounds } from './RelatoCierreSounds';
import { ConversacionDriada } from './santuario/ConversacionDriada';
import { VictoriaDialog } from './VictoriaDialog';

// Dialogs of the closing story, drawn over the canvas (each renders only while open).
export function RelatoCierreDialogs() {
  return (
    <>
      <ConversacionDriada />
      <CinematicaOverlay />
      <VictoriaDialog />
      <RelatoCierreSounds />
    </>
  );
}
