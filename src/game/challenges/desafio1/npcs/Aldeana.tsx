import { useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Npc } from '@/game/engine/interaction/Npc';
import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useVisibleFrom } from '@/game/world/visibility';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO1_MODELS.aldeana;
// By the well of the Villa de Boj square (ground at 10.9), facing the gate the player comes in through.
const POSITION: [number, number, number] = [-77.6, 10.9, 20.4];
const ROTATION_Y = Math.PI / 2;

// What happened in the Villa de Boj, from the scene schedule ("Relato inicial").
const RELATO = [
  'Hace una semana nos atacaron de noche. Al amanecer encontramos a varios guardias heridos y las puertas del templo rotas, abiertas de par en par.',
  'Al sacerdote lo hallamos junto al altar, con el báculo roto y apenas con vida. Antes de desmayarse alcanzó a señalar la capilla: faltaba el cáliz de madera, el de las hojas de sauce grabadas. Es el que mantiene la tierra fértil y el frío a raya.',
  'El alcalde mandó a los mejores exploradores tras los ladrones, pero ninguno ha vuelto. Y la gente de Arroyo Claro tampoco lo tiene: alguien más se llevó el cáliz.',
  'Anoche murió la anciana yerbatera. Los animales están débiles y las cosechas se quemaron bajo la nieve. Cada día hace más frío… a la villa no le queda mucho tiempo.',
];

// What the village women tell by the well: old stories that point to the two bonuses of the journey.
const HABLADURIAS = [
  'Los habitantes del pueblo ven con recelo tu presencia por tu inexperiencia, pero hay susurros de esperanza en muchas voces. La aldeana deja el cántaro junto al pozo y te mira de arriba abajo.',
  '«Mi abuela contaba que, donde termina el pantano, hay una choza vieja con una estatua de piedra. Decía que ayuda a quienes la mantienen en la luz y el calor. Si pasas por allí y no llevas prisa, límpiale el rostro y enciéndele un fuego».',
  '«Y en el bosque, si ves una lucecita que parpadea entre los árboles, no es un fuego fatuo: las hadas piden ayuda así. Casi nadie se desvía a buscarla».',
  '«No te lo digo para que pierdas tiempo, criatura. Te lo digo porque a la cumbre no se llega solo con fuerza».',
];

// The villager woman by the well of the Villa de Boj. Until her help is accepted she tells what happened and asks
// whether the player needs help (AldeanaAyudaDialog): YES sends the player to Imeri; after a NO she only asks again
// once the player walks away and comes back. Otherwise she tells the old tales that hint at Bonus 1 (the statue of
// the hut) and Bonus 2 (the fairy's light), as often as wanted.
export function Aldeana() {
  const visible = useVisibleFrom(VISIBLE_FROM.aldeana);
  const asking = useDialogOpen(DIALOG.aldeanaAyuda);
  const telling = useDialogOpen(DIALOG.aldeana);
  const accepted = useProgressStore((state) => state.progress.aldeanoHelp === 'accepted');
  const [askedThisVisit, setAskedThisVisit] = useState(false);
  const talking = asking || telling;

  return (
    <Npc
      url={URL}
      position={POSITION}
      rotationY={ROTATION_Y}
      visible={visible}
      animation={talking ? 'Talking' : 'Idle'}
      talk={{
        prompt: 'hablar con la aldeana',
        enabled: !talking,
        onTalk: () => {
          if (!accepted && !askedThisVisit) {
            setAskedThisVisit(true);
            useUIStore.getState().openDialog(DIALOG.aldeanaAyuda);
          } else {
            useUIStore.getState().openDialog(DIALOG.aldeana);
          }
        },
        onLeave: () => setAskedThisVisit(false),
      }}
    />
  );
}

// YES: the villager woman points the way to Imeri, who waits in front of her house. NO: Imeri will not be there and
// her door stays closed. The answer is kept in progress.aldeanoHelp (the field name of the saved games).
export function AldeanaAyudaDialog() {
  const isOpen = useDialogOpen(DIALOG.aldeanaAyuda);
  if (!isOpen) return null;

  const answer = (help: 'accepted' | 'rejected') => {
    saveProgress({ aldeanoHelp: help });
    useUIStore.getState().closeDialog();
    useToastStore
      .getState()
      .showToast(
        help === 'accepted'
          ? 'Aldeana: «Ve a la casa de Imeri, la cazadora que mejor conoce el pantano. Sigue el camino que sale de la villa: ella te espera frente a su casa».'
          : 'Aldeana: «Como quieras, criatura. Pero sin indicaciones no encontrarás a Imeri en su casa, y su puerta seguirá cerrada. Si cambias de opinión, aquí estaré, junto al pozo».',
      );
  };

  return (
    <ParchmentDialog
      title="Aldeana de la Villa de Boj"
      subtitle="Lo que pasó en la villa"
      paragraphs={RELATO}
      question="¿Necesitas ayuda para llegar a la Cumbre de la Desolación?"
      voice={['01_aldeana_02', '01_aldeana_03']}
    >
      <div className="flex justify-end flex-wrap gap-2.5 sm:gap-3">
        <ParchmentButton tone="decline" onClick={() => answer('rejected')}>
          No, gracias
        </ParchmentButton>
        <ParchmentButton onClick={() => answer('accepted')}>Sí, ayúdame</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}

export function AldeanaDialog() {
  const isOpen = useDialogOpen(DIALOG.aldeana);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="Aldeana de la Villa de Boj" subtitle="Lo que se cuenta junto al pozo" paragraphs={HABLADURIAS} voice={['01_narrador_03', '01_aldeana_01']} onClose={() => useUIStore.getState().closeDialog()} />
  );
}

useGLTF.preload(URL);
