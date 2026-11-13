import { Desafio1Sounds } from './Desafio1Sounds';
import { CartaAlcaldeDialog } from './cartaAlcalde/CartaAlcaldeDialog';
import { EstatuaDialog } from './chozaEstatua/EstatuaDialog';
import { AldeanaAyudaDialog, AldeanaDialog } from './npcs/Aldeana';
import { ImeriDialog } from './npcs/ImeriDialog';
import { PantanoSuperadoDialog } from './pantanoTristeza/PantanoSuperadoDialog';

// Dialogs of Challenge 1, drawn over the canvas (each renders only while open).
export function Desafio1Dialogs() {
  return (
    <>
      <CartaAlcaldeDialog />
      <AldeanaAyudaDialog />
      <ImeriDialog />
      <PantanoSuperadoDialog />
      <AldeanaDialog />
      <EstatuaDialog />
      <Desafio1Sounds />
    </>
  );
}
