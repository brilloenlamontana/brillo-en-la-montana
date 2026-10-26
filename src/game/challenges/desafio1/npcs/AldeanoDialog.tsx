import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// What happened in Villa Boj, from the scene schedule ("Relato inicial").
const RELATO = [
  'Hace una semana atacaron la villa durante la noche. Al amanecer encontramos a algunos guardias heridos y las puertas del templo rotas, abiertas de par en par.',
  'El sacerdote estaba junto al altar, con su báculo roto y apenas con vida. Antes de perder el sentido señaló la pequeña capilla interior: faltaba el cáliz de madera con hojas de sauce grabadas, el que mantiene la tierra fértil y el frío controlado.',
  'El alcalde mandó a los exploradores más experimentados tras los ladrones, pero ninguna partida ha vuelto. La gente de Arroyo Claro no lo tiene: alguien más se llevó el cáliz.',
  'Anoche murió la anciana yerbatera, los animales están débiles y las cosechas se quemaron bajo la nieve. El frío es cada vez mayor y a la villa no le queda mucho tiempo.',
];

// The villager's dialog. YES: villagers point the way to Imeri, who waits in front of her house. NO: Imeri will not be
// there and her door stays closed (the player can ask the villager again).
export function AldeanoDialog() {
  const isOpen = useDialogOpen(DIALOG.aldeano);
  if (!isOpen) return null;

  const answer = (help: 'accepted' | 'rejected') => {
    saveProgress({ aldeanoHelp: help });
    useUIStore.getState().closeDialog();
    useToastStore
      .getState()
      .showToast(
        help === 'accepted'
          ? 'Los aldeanos te indican el camino a la casa de Imeri, la cazadora que mejor conoce el pantano. Te espera frente a su casa.'
          : 'Decides emprender la aventura solo. Sin indicaciones, Imeri no estará en su casa y su puerta seguirá cerrada.',
      );
  };

  return (
    <ParchmentDialog title="Aldeano de Villa Boj" subtitle="Lo que pasó en la villa" paragraphs={RELATO}>
      <p className="font-bold text-sm sm:text-base mb-3">¿Necesitas ayuda para llegar a la Cumbre de la Desolación?</p>
      <div className="flex justify-end flex-wrap gap-2.5 sm:gap-3">
        <ParchmentButton tone="decline" onClick={() => answer('rejected')}>
          No
        </ParchmentButton>
        <ParchmentButton onClick={() => answer('accepted')}>Sí, ayúdame</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
