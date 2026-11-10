import { DriadaDialog } from './santuario/DriadaDialog';
import { VictoriaDialog } from './VictoriaDialog';

// Dialogs of the closing story, drawn over the canvas (each renders only while open).
export function RelatoCierreDialogs() {
  return (
    <>
      <DriadaDialog />
      <VictoriaDialog />
    </>
  );
}
