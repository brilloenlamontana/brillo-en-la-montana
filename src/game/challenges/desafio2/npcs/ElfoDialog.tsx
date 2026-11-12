import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

import { isDesafio2Completado } from '../mission';

// "Audio explicación del Elfo", from the scene schedule.
const EXPLICACION = [
  'Me compadezco de ti, aventurero. Vivo en este bosque desde hace mucho tiempo y conozco bien los peligros del camino, pero no puedo acompañarte: es mi magia la que mantiene a raya a los dragones, para que no ataquen los pueblos. Lo que sí puedo darte son consejos… y algunas herramientas, si las quieres.',
  'En el bosque te esperan tres grandes peligros: los duendes salvajes, los árboles venenosos y los senderos que cambian.',
  'Es un bosque espeso; hay quien dice que los árboles caminan. Tendrás que orientarte muy bien, porque aquí cualquiera se pierde.',
  'Los duendes merodean por todas partes, y en esta época del año están muy agresivos. Evítalos con cuidado… o sé lo bastante fuerte para vencerlos.',
  'Pero lo más peligroso son los frutales. Se ven casi idénticos a los perales y a los manzanos, y sin embargo se cargan de frutos venenosos que matarían a cualquier imprudente.',
];

const FELICITACION = [
  '¡Lo lograste, valiente aventurero! Has demostrado gran destreza con la espada élfica, supiste ver la verdad con el lente revelador y encontraste el paso en la espesura con el mapa.',
  'El camino hacia la Cumbre de la Desesperación está abierto ante ti. En la falda de la montaña encontrarás a la enana Hedrig en las ruinas del pueblo minero. Ten cuidado, pues los derrumbes y los espectros custodian las alturas.',
  'Que la luz de los árboles sagrados guíe tus pasos.',
];

// The elf explains the dangers of the forest and offers his tools. Accepting opens his house (sword, lens and map
// inside) and switches the backpack to Challenge 2. Refusing keeps the door closed; he can be asked again.
// Once Challenge 2 is completed, he congratulates the player and points the way to Hedrig.
export function ElfoDialog() {
  const isOpen = useDialogOpen(DIALOG.elfo);
  const progress = useProgressStore((state) => state.progress);
  if (!isOpen) return null;

  const close = () => useUIStore.getState().closeDialog();
  const completed = isDesafio2Completado(progress);
  const accepted = progress.elfoHelp === 'accepted';

  if (completed) {
    return (
      <ParchmentDialog title="El elfo del bosque" subtitle="Mago protector del bosque" paragraphs={FELICITACION} voice={['02_elfo_03']}>
        <div className="flex justify-end">
          <ParchmentButton onClick={close}>Gracias, elfo</ParchmentButton>
        </div>
      </ParchmentDialog>
    );
  }
  const answer = (help: 'accepted' | 'rejected') => {
    saveProgress({ interactedWithElfo: true, elfoHelp: help });
    close();
    useToastStore
      .getState()
      .showToast(
        help === 'accepted'
          ? 'El elfo abrió su casa en la copa del árbol: sube y toma la espada, el lente y el mapa. Tu mochila ya guarda sus herramientas.'
          : 'La casa del elfo seguirá cerrada. Puedes volver a hablar con él.',
      );
  };

  return (
    <ParchmentDialog title="El elfo del bosque" subtitle="Un mago elfo que vive en la copa de un árbol" paragraphs={EXPLICACION}
      question={accepted ? undefined : '¿Quieres llevar mis herramientas? En mi casa tengo una espada, un lente y un mapa.'}
      voice={accepted ? ['02_elfo_02'] : ['02_elfo_02', '02_elfo_01']}
    >
      {accepted ? (
        <div className="flex justify-end">
          <ParchmentButton onClick={close}>Entendido</ParchmentButton>
        </div>
      ) : (
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
