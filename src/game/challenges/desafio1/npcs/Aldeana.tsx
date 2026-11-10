import { useGLTF } from '@react-three/drei';
import { Npc } from '@/game/engine/interaction/Npc';
import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useVisibleFrom } from '@/game/world/visibility';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO1_MODELS.aldeana;
// By the well of the Villa Boj square (ground at 10.9), facing the gate the player comes in through.
const POSITION: [number, number, number] = [-77.6, 10.9, 20.4];
const ROTATION_Y = Math.PI / 2;

// What the village women tell by the well: old stories that point to the two bonuses of the journey.
const HABLADURIAS = [
  'Los habitantes del pueblo ven con recelo tu presencia por tu inexperiencia, pero hay susurros de esperanza en muchas voces. La aldeana deja el cántaro junto al pozo y te mira de arriba abajo.',
  '«Mi abuela contaba que, donde termina el pantano, hay una choza vieja con una estatua de piedra. Decía que ayuda a quienes la mantienen en la luz y el calor. Si pasas por allí y no llevas prisa, límpiale el rostro y enciéndele un fuego».',
  '«Y en el bosque, si ves una lucecita que parpadea entre los árboles, no es un fuego fatuo: las hadas piden ayuda así. Casi nadie se desvía a buscarla».',
  '«No te lo digo para que pierdas tiempo, criatura. Te lo digo porque a la cumbre no se llega solo con fuerza».',
];

// A villager woman by the well of Villa Boj. She does not decide anything in the story: she tells the old tales that
// hint at Bonus 1 (the statue of the hut) and Bonus 2 (the fairy's light), and can be listened to as often as wanted.
export function Aldeana() {
  const visible = useVisibleFrom(VISIBLE_FROM.aldeano);
  const talking = useDialogOpen(DIALOG.aldeana);

  return (
    <Npc
      url={URL}
      position={POSITION}
      rotationY={ROTATION_Y}
      visible={visible}
      animation={talking ? 'Talking' : 'Idle'}
      talk={{ prompt: 'hablar con la aldeana', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.aldeana) }}
    />
  );
}

export function AldeanaDialog() {
  const isOpen = useDialogOpen(DIALOG.aldeana);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="Aldeana de la Villa de Boj" subtitle="Lo que se cuenta junto al pozo" paragraphs={HABLADURIAS} voice={['01_narrador_03', '01_aldeana_01']}>
      <div className="flex justify-end">
        <ParchmentButton onClick={() => useUIStore.getState().closeDialog()}>Lo tendré presente</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}

useGLTF.preload(URL);
