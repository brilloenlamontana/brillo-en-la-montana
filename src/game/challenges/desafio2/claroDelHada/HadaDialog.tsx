import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Acertijo 2 — Una lucecita entre los árboles", from the scene schedule: the light was a call for help.
const AGRADECIMIENTO = [
  'La espada élfica corta las zarzas de un solo tajo. La lucecita que parpadeaba entre los árboles se enciende con fuerza y sale disparada hacia las copas: era un hada, atrapada desde hacía días en una trampa de espinas de los duendes.',
  'Da dos vueltas sobre el claro, estirando las alas, y baja a revolotear frente a ti: «Algo dentro de ti supo que mi luz era un pedido de ayuda, y aun así pudiste haber seguido de largo. Gracias, aventurero: pocos se desvían de su camino por alguien a quien no conocen».',
  '«Toma mi amuleto, está sobre el atril de raíces. Allá arriba, en la cumbre, el frío y la tristeza son grandes: que su luz te recuerde que no caminas solo».',
];

const AMULETO = [
  'Tomas el amuleto del atril de raíces: es tibio, y dentro de la piedra late una luz pequeña, igual a la que viste parpadear desde el sendero.',
  'El hada vuela en círculos a tu alrededor, riendo: «Ahora llevas un poco de mi luz. Cuando el camino se ponga oscuro, recuerda que te desviaste para ayudar: eso vale más que llegar primero».',
];

const DESPEDIDA = [
  '«¡Sigues aquí! El bosque ya no me da miedo: desde arriba veo venir a los duendes de lejos», dice el hada, sin dejar de revolotear.',
  '«Ve tranquilo hacia la montaña. Mi amuleto te acompaña, y yo cuidaré este claro para quien venga detrás de ti».',
];

const close = () => useUIStore.getState().closeDialog();

// The fairy of the clearing (Bonus 2): she thanks the player when freed (and whenever they talk to her before taking
// the amulet), celebrates when her amulet is picked up, and has a few words for whoever comes back.
export function HadaDialog() {
  const dialog = useUIStore((state) => state.dialog);
  const completado = useProgressStore((state) => state.progress.bono2Completado);

  if (dialog === DIALOG.hadaAmuleto) {
    return (
      <ParchmentDialog title="¡Bono 2 completado!" subtitle="Recibiste el amuleto del hada" paragraphs={AMULETO}>
        <div className="flex justify-end">
          <ParchmentButton onClick={close}>Seguir el camino</ParchmentButton>
        </div>
      </ParchmentDialog>
    );
  }
  if (dialog !== DIALOG.hada) return null;

  return (
    <ParchmentDialog title="El hada del claro" subtitle="Bono 2 · Una lucecita entre los árboles" paragraphs={completado ? DESPEDIDA : AGRADECIMIENTO}>
      <div className="flex justify-end">
        <ParchmentButton onClick={close}>{completado ? 'Hasta pronto' : 'Recoger el amuleto'}</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
