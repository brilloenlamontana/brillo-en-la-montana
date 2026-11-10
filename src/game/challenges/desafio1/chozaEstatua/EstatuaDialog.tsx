import { ANILLO_ORO, EXTRA_STAR_TOAST, withExtraStar } from '@/game/challenges/bonos';
import { playSfx } from '@/game/engine/audio/audio';
import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// "Acertijo 1", from the scene schedule: the statue of the ruined hut and what its inscription asks for.
const INSCRIPCION = '«Ayudo a quienes me mantienen en la luz y el calor»';
const RUNAS = '«Limpia mi rostro, enciende mi espíritu»';

type Stage = { title: string; subtitle: string; paragraphs: string[]; voice: string; button: string; act?: () => void };

const close = () => useUIStore.getState().closeDialog();

function limpiar() {
  playSfx('d1_estatua_limpiar');
  saveProgress({ estatuaLimpia: true });
}

function encender() {
  playSfx('d1_estatua_fuego');
  saveProgress({ estatuaEncendida: true });
}

function tomarAnillo() {
  const { progress } = useProgressStore.getState();
  playSfx('d1_anillo');
  saveProgress({ collectedItems: [...new Set([...progress.collectedItems, ANILLO_ORO])], bono1Completado: true, vidasExtra: withExtraStar(progress) });
  useToastStore.getState().showToast(EXTRA_STAR_TOAST);
}

const CUBIERTA: Stage = {
  title: 'La estatua de la choza',
  subtitle: 'Bono 1 · La choza a la salida del pantano',
  paragraphs: [
    'En el centro de la choza medio derruida, cubierta de algas verdosas y lodo, hay una estatua de piedra igualmente tapada por el moho y la humedad. A sus pies descansa un plato redondo de piedra.',
    `En la base alcanzas a leer una inscripción: ${INSCRIPCION}. Debajo, casi borradas, unas runas más pequeñas: ${RUNAS}.`,
    'El moho le cubre por completo el rostro. Detenerte aquí te costará tiempo, pero algo en esa mirada escondida pide ayuda.',
  ],
  voice: '01_narrador_06',
  button: 'Limpiar el moho de su rostro',
  act: limpiar,
};

const LIMPIA: Stage = {
  title: 'La estatua de la choza',
  subtitle: 'Su rostro ya está limpio',
  paragraphs: [
    'Con paciencia retiras el moho y la humedad: bajo la costra verde aparece un rostro sereno, con los ojos cerrados y las manos juntas contra el pecho.',
    `Las runas lo decían en orden: ${RUNAS}. El rostro está limpio; falta el espíritu. El plato de piedra a sus pies tiene restos de ceniza muy vieja.`,
  ],
  voice: '01_narrador_07',
  button: 'Encender un fuego en el plato',
  act: encender,
};

const ENCENDIDA: Stage = {
  title: 'La estatua despierta',
  subtitle: 'La luz y el calor han vuelto a la choza',
  paragraphs: [
    'Enciendes un fuego en el plato. Las llamas suben, envuelven la estatua, queman lo que quedaba de moho e iluminan cada rincón de la choza.',
    'Cuando el fuego baja, la estatua aparece con las manos abiertas: en ellas te ofrece un anillo de oro.',
  ],
  voice: '01_narrador_08',
  button: 'Tomar el anillo de oro',
  act: tomarAnillo,
};

const COMPLETADO: Stage = {
  title: '¡Bono 1 completado!',
  subtitle: 'Recibiste el anillo de oro de la estatua',
  paragraphs: [
    'El anillo aún está tibio por el fuego. En su interior lleva grabadas las mismas palabras de la base: «Ayudo a quienes me mantienen en la luz y el calor».',
    'La estatua queda con las manos abiertas y el fuego encendido a sus pies. Perdiste un poco de tiempo, pero no sales del pantano con las manos vacías.',
  ],
  voice: '01_narrador_09',
  button: 'Seguir el camino',
};

// The statue of the ruined hut (Bonus 1), told step by step in one dialog: read the inscription and clean its face,
// light the fire in the stone plate, take the gold ring it offers. Each button does its step and shows the next one.
export function EstatuaDialog() {
  const isOpen = useDialogOpen(DIALOG.estatua);
  const limpia = useProgressStore((state) => state.progress.estatuaLimpia);
  const encendida = useProgressStore((state) => state.progress.estatuaEncendida);
  const completado = useProgressStore((state) => state.progress.bono1Completado);
  if (!isOpen) return null;

  const stage = completado ? COMPLETADO : encendida ? ENCENDIDA : limpia ? LIMPIA : CUBIERTA;

  return (
    <ParchmentDialog title={stage.title} subtitle={stage.subtitle} paragraphs={stage.paragraphs} voice={[stage.voice]}>
      <div className="flex justify-end flex-wrap gap-2.5 sm:gap-3">
        {stage.act && (
          <ParchmentButton tone="decline" onClick={close}>
            Ahora no
          </ParchmentButton>
        )}
        <ParchmentButton onClick={stage.act ?? close}>{stage.button}</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
