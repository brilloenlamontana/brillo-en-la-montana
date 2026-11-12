import { useState } from 'react';
import { findCharacter } from '@/data/characters';
import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useAuthStore } from '@/store/authStore';
import { useDialogOpen } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { useRitualStore } from './ritual';

type Voz = 'narrador' | 'driada' | 'jugador';
// `clip`: recorded voice (docs/sonido/guion_voces.csv). The player's lines exist in two voices: `04_jugadora_NN` for
// female characters and `04_jugador_NN` for male ones.
type Linea = { voz: Voz; clip: string; texto: string };

// The dryad does not hand the chalice over just like that: the player has to answer her. From the scene schedule
// ("Lo que les dice la Dríada"), turned into a conversation.
const LINEAS: readonly Linea[] = [
  {
    voz: 'narrador',
    clip: '04_narrador_12',
    texto: 'Llamado por la calidez del resplandor verde, llegas ante la puerta del santuario, con su enorme sauce de filigrana de plata. Una figura delgada sale a tu encuentro: una dríada.',
  },
  {
    voz: 'driada',
    clip: '04_driada_02',
    texto: 'Te doy la bienvenida. Pocos llegan con vida a esta cumbre. Sé lo que buscas: el cáliz. Pero no puedo entregártelo. Tardé quinientos años en encontrar a quien había tomado el alma de mi pueblo. Por quinientos años, los humanos robaron el calor y disfrutaron de nuestro eterno verano.',
  },
  {
    voz: 'jugador',
    clip: '01',
    texto: 'No vine a robar nada. Crucé el Pantano de la Tristeza, el Bosque de la Oscuridad y los túneles de esta montaña porque mi gente se muere de frío. En la Villa de Boj las cosechas se queman bajo la nieve y los niños enferman.',
  },
  {
    voz: 'driada',
    clip: '04_driada_03',
    texto: 'Mi pueblo también conoció ese frío. Cuando nos quitaron el cáliz, la cumbre se cubrió de hielo y tuvimos que abandonar nuestro hogar. ¿Por qué habría de confiar en ti?',
  },
  {
    voz: 'jugador',
    clip: '02',
    texto: 'Porque no te pido que me lo entregues. Enfrenté a un gólem de piedra, calmé el llanto de una niña perdida y le gané el pulso a un ogro: nadie me regaló el camino. Solo te pido que el frío termine, para tu pueblo y para el mío.',
  },
  {
    voz: 'driada',
    clip: '04_driada_04',
    texto: 'Hablas con verdad. Quinientos años de rencor no han devuelto a nadie a su hogar. El cáliz se queda en su altar, donde debe estar; pero su calor nunca debió ser de un solo pueblo. Ven conmigo: que su luz alcance a todos.',
  },
  { voz: 'jugador', clip: '03', texto: 'Gracias, dríada. Te sigo.' },
];

const TONO = { narrador: 'pergamino', driada: 'driada', jugador: 'jugador' } as const;

// The conversation with the dryad, in the text box at the bottom of the screen: each line is said by its voice,
// written as it is said, and the next one follows by itself. Nothing can be skipped; the camera can still be turned
// around the two of them.
export function ConversacionDriada() {
  const isOpen = useDialogOpen(DIALOG.driada);
  return isOpen ? <Conversacion /> : null;
}

function Conversacion() {
  const nickname = useAuthStore((state) => state.user?.nickname);
  const avatarName = useAuthStore((state) => state.user?.avatarName);
  const [index, setIndex] = useState(0);

  const linea = LINEAS[Math.min(index, LINEAS.length - 1)];
  const female = findCharacter(avatarName).gender === 'female';
  const clip = linea.voz === 'jugador' ? `04_${female ? 'jugadora' : 'jugador'}_${linea.clip}` : linea.clip;
  const nombre = linea.voz === 'narrador' ? 'Narrador' : linea.voz === 'driada' ? 'Dríada del santuario' : nickname || 'Tú';

  return (
    <ParchmentDialog
      title={nombre}
      subtitle={`${index + 1} de ${LINEAS.length}`}
      paragraphs={[linea.voz === 'narrador' ? linea.texto : `«${linea.texto}»`]}
      voice={[clip]}
      tone={TONO[linea.voz]}
      onDone={() => (index + 1 < LINEAS.length ? setIndex(index + 1) : useRitualStore.getState().caminar())}
    />
  );
}
