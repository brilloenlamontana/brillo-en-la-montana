import { EXTRA_STAR_TOAST, EXTRA_STAR_VOICE } from '@/game/challenges/bonos';
import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { empezarAnillo } from './anillo';
import { empezarEncendido } from './encendido';
import { empezarLimpieza } from './limpieza';

// "Acertijo 1", from the scene schedule: the statue of the ruined hut and what its inscription asks for.
const INSCRIPCION = '«Ayudo a quienes me mantienen en la luz y el calor»';
const RUNAS = '«Limpia mi rostro, enciende mi espíritu»';

type Stage = { title: string; subtitle: string; paragraphs: string[]; voice: string[]; button: string; act?: () => void };

const close = () => useUIStore.getState().closeDialog();

// The avatar goes up to the statue and cleans its face by hand (limpieza.ts).
function limpiar() {
  close();
  empezarLimpieza();
}

// The avatar kneels by the plate and strikes a flint until the fire catches (encendido.ts).
function encender() {
  close();
  empezarEncendido();
}

// The avatar walks up to the statue's hands and takes the ring (anillo.ts): the bonus is won when it has it.
function tomarAnillo() {
  close();
  empezarAnillo();
}

const CUBIERTA: Stage = {
  title: 'La estatua de la choza',
  subtitle: 'Bono 1 · La choza a la salida del pantano',
  paragraphs: [
    'En el centro de la choza medio derruida, cubierta de algas verdosas y lodo, hay una estatua de piedra igualmente tapada por el moho y la humedad. A sus pies descansa un plato redondo de piedra.',
    `En la base alcanzas a leer una inscripción: ${INSCRIPCION}. Debajo, casi borradas, unas runas más pequeñas: ${RUNAS}.`,
    'El moho le cubre por completo el rostro. Detenerte aquí te costará tiempo, pero algo en esa mirada escondida pide ayuda.',
  ],
  voice: ['01_narrador_06'],
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
  voice: ['01_narrador_07'],
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
  voice: ['01_narrador_08'],
  button: 'Tomar el anillo de oro',
  act: tomarAnillo,
};

const COMPLETADO: Stage = {
  title: '¡Bono 1 completado!',
  subtitle: 'Recibiste el anillo de oro de la estatua',
  paragraphs: [
    'El anillo aún está tibio por el fuego. En su interior lleva grabadas las mismas palabras de la base: «Ayudo a quienes me mantienen en la luz y el calor».',
    'La estatua queda con las manos abiertas y el fuego encendido a sus pies.',
    EXTRA_STAR_TOAST,
  ],
  voice: ['01_narrador_09', EXTRA_STAR_VOICE],
  button: 'Seguir el camino',
};

// The statue of the ruined hut (Bonus 1), told step by step in one dialog: read the inscription, clean its face (by
// hand: the button starts it),
// light the fire in the stone plate, take the gold ring it offers. Each button starts its step, which the avatar does
// by hand; the dialog comes back to tell what happened.
export function EstatuaDialog() {
  const isOpen = useDialogOpen(DIALOG.estatua);
  const limpia = useProgressStore((state) => state.progress.estatuaLimpia);
  const encendida = useProgressStore((state) => state.progress.estatuaEncendida);
  const completado = useProgressStore((state) => state.progress.bono1Completado);
  if (!isOpen) return null;

  const stage = completado ? COMPLETADO : encendida ? ENCENDIDA : limpia ? LIMPIA : CUBIERTA;

  return (
    <ParchmentDialog title={stage.title} subtitle={stage.subtitle} paragraphs={stage.paragraphs} voice={stage.voice} onClose={close}>
      {stage.act && (
        <div className="flex justify-end">
          <ParchmentButton onClick={stage.act}>{stage.button}</ParchmentButton>
        </div>
      )}
    </ParchmentDialog>
  );
}
