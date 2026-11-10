import { BosqueSuperadoDialog } from './bosqueOscuridad/BosqueSuperadoDialog';
import { Desafio2Sounds } from './Desafio2Sounds';
import { HadaDialog } from './claroDelHada/HadaDialog';
import { ElfoDialog } from './npcs/ElfoDialog';

// Dialogs of Challenge 2, drawn over the canvas (each renders only while open).
export function Desafio2Dialogs() {
  return (
    <>
      <ElfoDialog />
      <BosqueSuperadoDialog />
      <HadaDialog />
      <Desafio2Sounds />
    </>
  );
}

