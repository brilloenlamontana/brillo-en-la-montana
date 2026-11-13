import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Audio explicación de Imeri", from the scene schedule.
const EXPLICACION = [
  'El Pantano de la Tristeza hace honor a su nombre: es un lugar miserable. Como es parte del delta del Gran Río, las corrientes cambian los senderos todo el tiempo, así que nadie ha podido hacer un mapa.',
  'Los caminos de barro a veces desaparecen sin aviso, y el suelo se ablanda hasta formar pozos que parecen poco profundos… pero se tragan animales, y hasta a algún borracho despistado. Entrar solo es mortal: lo mejor es ir atado a una soga, para que te puedan sacar del lodazal.',
  'Los que han intentado cruzarlo dicen que lo habrían soportado todo, si no fuera por los insectos. El pantano está plagado de unos mosquitos gigantes; aquí les decimos Zumbones. Su picadura da fiebre y unos dolores terribles durante días. Una sola no te mata… pero los Zumbones nunca pican una sola vez.',
  'Y hay algo que hasta los cazadores tememos: un Golem gigante, una criatura feroz que creó hace cientos de años un mago que ya murió. El secreto para detenerlo murió con él. Solo se sabe que al Golem le brilla una gran luz azul en el centro del pecho.',
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
          ? 'Imeri: «Pasa, la puerta ya está abierta. Entra y recoge lo que te sirva, y guárdalo en tu mochila».'
          : 'Imeri: «Como prefieras. Mi puerta seguirá cerrada, pero si cambias de opinión, vuelve a hablarme».',
      );
  };

  return (
    <ParchmentDialog
      title="Imeri"
      subtitle="La cazadora que mejor conoce el pantano"
      paragraphs={EXPLICACION}
      question={accepted ? undefined : '¿Quieres que te ayude? En mi casa tengo lo que necesitas para cruzar el pantano.'}
      voice={accepted ? ['01_imeri_02'] : ['01_imeri_02', '01_imeri_01']}
      onClose={accepted ? close : undefined}
    >
      {!accepted && (
        <div className="flex justify-end flex-wrap gap-2.5 sm:gap-3">
          <ParchmentButton tone="decline" onClick={() => answer('rejected')}>
            No, gracias
          </ParchmentButton>
          <ParchmentButton onClick={() => answer('accepted')}>Sí, ayúdame</ParchmentButton>
        </div>
      )}
    </ParchmentDialog>
  );
}
