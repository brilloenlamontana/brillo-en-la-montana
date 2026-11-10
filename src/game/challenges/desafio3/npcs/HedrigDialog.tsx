import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Audio explicación de Hedrig", from the scene schedule.
const EXPLICACION = [
  'Mientras un breve respiro ayuda a recuperar las fuerzas, un retumbar como de un trueno quiebra el silencio de la falda de la montaña. La minera no parece preocuparse y señala numerosos montículos de roca que se han desprendido a través de los años: los derrumbes son cosa de todos los días, pero ella conoce los túneles más seguros para evitar los deslaves.',
  'En medio de la oscuridad se escuchan gemidos y gritos de dolor ahogados. Una vez al año se oyen esos mismos sonidos, siempre en el aniversario de la muerte de la familia de la cabaña derrumbada, y algunas noches se escucha la voz de una niña pequeña que grita pidiendo que le devuelvan a Simona. Hedrig encontró muchas cosas entre las ruinas, pero nunca se atrevió a enfrentar al espectro.',
  'Protegiendo el sendero, casi llegando a la cima, encontrarás un Ogro enorme que vive allá desde hace muchísimo tiempo: parece que alguien lo contrató para proteger la subida. No es agresivo, pero no deja pasar a nadie; dice que quien aspire a llegar a la cima deberá demostrar que es más fuerte que él.',
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
          ? 'Hedrig abrió su casa: entra y recoge el guante de minero, la brújula y la muñeca de trapo.'
          : 'La puerta de la casa de Hedrig seguirá cerrada. Puedes volver a hablar con ella.',
      );
  };

  return (
    <ParchmentDialog title="Hedrig" subtitle="La enana minera que conoce los túneles de la cumbre" paragraphs={EXPLICACION}>
      {accepted ? (
        <div className="flex justify-end">
          <ParchmentButton onClick={close}>Entendido</ParchmentButton>
        </div>
      ) : (
        <>
          <p className="font-bold text-sm sm:text-base mb-3">¿Quieres mi ayuda? En mi casa guardo lo que encontré entre las ruinas: te servirá allá arriba.</p>
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
