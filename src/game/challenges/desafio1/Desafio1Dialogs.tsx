import { CartaAlcaldeDialog } from './cartaAlcalde/CartaAlcaldeDialog';
import { AldeanoDialog } from './npcs/AldeanoDialog';
import { ImeriDialog } from './npcs/ImeriDialog';
import { PantanoSuperadoDialog } from './pantanoTristeza/PantanoSuperadoDialog';

// Dialogs of Challenge 1, drawn over the canvas (each renders only while open).
export function Desafio1Dialogs() {
  return (
    <>
      <CartaAlcaldeDialog />
      <AldeanoDialog />
      <ImeriDialog />
      <PantanoSuperadoDialog />
    </>
  );
}
