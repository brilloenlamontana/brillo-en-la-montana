import { Desafio3Sounds } from './Desafio3Sounds';
import { CumbreAlcanzadaDialog } from './CumbreAlcanzadaDialog';
import { HedrigDialog } from './npcs/HedrigDialog';
import { LlegadaHedrigDialog } from './npcs/LlegadaHedrigDialog';
import { OgroVencidoDialog } from './ogro/OgroVencidoDialog';

// Dialogs of Challenge 3, drawn over the canvas (each renders only while open).
export function Desafio3Dialogs() {
  return (
    <>
      <LlegadaHedrigDialog />
      <HedrigDialog />
      <OgroVencidoDialog />
      <CumbreAlcanzadaDialog />
      <Desafio3Sounds />
    </>
  );
}
