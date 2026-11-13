import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Audio explicación de Hedrig", from the scene schedule.
const EXPLICACION = [
  'Descansa un momento y recupera las fuerzas. ¿Oyes ese retumbar, como de trueno? No te asustes. Mira todos esos montones de roca: aquí los derrumbes son cosa de todos los días. Pero yo conozco los túneles más seguros.',
  'Allá adentro, en la oscuridad, se oyen gemidos y gritos ahogados. Pasa una vez al año, siempre en el aniversario de la muerte de la familia de la cabaña derrumbada. Y algunas noches se escucha la voz de una niña pequeña que pide a gritos que le devuelvan a Simona. Yo encontré muchas cosas entre las ruinas… pero nunca me atreví a enfrentar al espectro.',
  'Y casi llegando a la cima, cuidando el sendero, vas a encontrar a un Ogro enorme. Vive allí desde hace muchísimo; parece que alguien lo contrató para vigilar la subida. No es agresivo, pero no deja pasar a nadie: dice que quien quiera llegar a la cima tiene que demostrarle que es más fuerte que él.',
];

// Hedrig explains the dangers of the summit and offers help: only if the player accepts does her door unlock, with the
// glove, the compass and the doll inside.
export function HedrigDialog() {
  const isOpen = useDialogOpen(DIALOG.hedrig);
  const accepted = useProgressStore((state) => state.progress.hedrigHelp === 'accepted');
  if (!isOpen) return null;

  const close = () => useUIStore.getState().closeDialog();
  const answer = (help: 'accepted' | 'rejected') => {
    saveProgress({ interactedWithHedrig: true, hedrigHelp: help });
    close();
    useToastStore
      .getState()
      .showToast(
        help === 'accepted'
          ? 'Hedrig: «Ya abrí mi casa. Entra y recoge el guante de minero, la brújula y la muñeca de trapo».'
          : 'Hedrig: «Mi puerta seguirá cerrada. Si cambias de idea, aquí estaré, junto a la fogata».',
      );
  };

  return (
    <ParchmentDialog title="Hedrig" subtitle="La enana minera que conoce los túneles de la cumbre" paragraphs={EXPLICACION}
      question={accepted ? undefined : '¿Quieres mi ayuda? En mi casa guardo lo que encontré entre las ruinas: te servirá allá arriba.'}
      voice={accepted ? ['03_hedrig_02'] : ['03_hedrig_02', '03_hedrig_01']}
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
