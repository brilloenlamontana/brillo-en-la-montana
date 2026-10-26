import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Audio explicación de Imeri", from the scene schedule.
const EXPLICACION = [
  'El Pantano de la Tristeza hace honor a su nombre, es un lugar miserable. Al formar parte del Delta del Gran Río, las corrientes siempre fluyen con fuerza, cambiando los senderos con frecuencia, lo que imposibilita hacer un mapa.',
  'Los senderos embarrados a veces desaparecen sin aviso y los suelos se licúan dejando pozos que parecen poco profundos, pero que se tragan a veces a los animales e incluso a los borrachos desprevenidos que se aventuran sin saberlo. Entrar solo, sin alguien que te pueda sacar de un apuro, es mortal; lo mejor es ir atado a alguien que te pueda sacar de un lodazal.',
  'La mayoría de los que intentan atravesarlo cuentan que hubieran podido soportarlo todo con más valentía si no fuera por los insectos: el pantano está plagado de unos mosquitos gigantes que los pueblerinos llaman Zumbones, cuya picadura produce fiebres y terribles dolores por varios días. Una sola picadura no es mortal, pero los Zumbones nunca pican una sola vez.',
  'Entre las amenazas más temidas por los cazadores hay algo particularmente amenazante: un Golem Gigante, una feroz criatura creada hace cientos de años por un mago que ya murió. El secreto de cómo desactivarlo o controlarlo murió con su creador. Se cuenta que el Golem emite una gran luz azul en el centro del pecho.',
];

// Imeri explains the dangers of the swamp and offers help: only if the player accepts does her door unlock (gem,
// rope and potions inside) and the backpack become active.
export function ImeriDialog() {
  const isOpen = useDialogOpen(DIALOG.imeri);
  const accepted = useProgressStore((state) => state.progress.imeriHelp === 'accepted');
  if (!isOpen) return null;

  const close = () => useUIStore.getState().closeDialog();
  const answer = (help: 'accepted' | 'rejected') => {
    saveProgress({ interactedWithImeri: true, imeriHelp: help });
    close();
    useToastStore
      .getState()
      .showToast(
        help === 'accepted'
          ? 'Imeri abrió su casa y se activó tu mochila: entra y recoge lo que te sirva.'
          : 'La puerta de la casa de Imeri seguirá cerrada. Puedes volver a hablar con ella.',
      );
  };

  return (
    <ParchmentDialog title="Imeri" subtitle="La cazadora que mejor conoce el pantano" paragraphs={EXPLICACION}>
      {accepted ? (
        <div className="flex justify-end">
          <ParchmentButton onClick={close}>Entendido</ParchmentButton>
        </div>
      ) : (
        <>
          <p className="font-bold text-sm sm:text-base mb-3">¿Quieres que te ayude? En mi casa tengo lo que necesitas para cruzar el pantano.</p>
          <div className="flex justify-end flex-wrap gap-2.5 sm:gap-3">
            <ParchmentButton tone="decline" onClick={() => answer('rejected')}>
              No, gracias
            </ParchmentButton>
            <ParchmentButton onClick={() => answer('accepted')}>Sí, ayúdame</ParchmentButton>
          </div>
        </>
      )}
    </ParchmentDialog>
  );
}
