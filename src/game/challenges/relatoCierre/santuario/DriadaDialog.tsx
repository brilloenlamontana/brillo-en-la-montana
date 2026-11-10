import { playSfx } from '@/game/engine/audio/audio';
import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { isCalizTomado, isSantuarioAbierto } from '../mission';

// The welcome and "Lo que les dice la Dríada", from the scene schedule.
const BIENVENIDA = [
  'Llamado por la calidez del resplandor verde, te acercas al santuario con precaución. Al llegar a la puerta cerrada de madera, en la que se encuentra engastado un hermoso y enorme sauce de filigrana de plata, una figura delgada sale a tu encuentro.',
  'En la lengua común, pero con palabras antiguas y muy educadas, una dríada te da la bienvenida y te señala el interior del santuario, invitándote a resguardarte del frío.',
  '«Tardé 500 años en encontrar a quien había tomado el alma de mi pueblo. ¡Y pensar que estaba tan cerca! Ahora el resplandor de esta copa señalará el camino de regreso para aquellos que se vieron obligados a abandonar su hogar».',
  '«Por 500 años, los humanos robaron el calor y disfrutaron de nuestro eterno verano. Ahora el cáliz está donde debe estar».',
];

// The dryad at the sanctuary door: her words unlock the silver willow door, so the player can walk in to the altar.
export function DriadaDialog() {
  const isOpen = useDialogOpen(DIALOG.driada);
  const abierto = useProgressStore((state) => isSantuarioAbierto(state.progress));
  const tomado = useProgressStore((state) => isCalizTomado(state.progress));
  if (!isOpen) return null;

  const close = () => {
    useUIStore.getState().closeDialog();
    if (abierto) return;
    saveProgress({ interactedWithDriada: true });
    playSfx('rc_puertas');
    useToastStore.getState().showToast('La dríada abre las puertas de sauce del santuario: entra y acércate al altar, bajo la torre.');
  };

  return (
    <ParchmentDialog title="La dríada del santuario" subtitle="Guardiana del resplandor verde" paragraphs={BIENVENIDA} voice={['04_narrador_01', '04_driada_01']}>
      <div className="flex justify-end">
        <ParchmentButton onClick={close}>{tomado ? 'Gracias, dríada' : abierto ? 'Entendido' : 'Entrar al santuario'}</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
