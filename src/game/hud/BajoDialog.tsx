import { bajoDialog, type Bajo } from '@/game/challenges/progression';
import { usePlayerStore } from '@/game/player/playerStore';
import { clearCharacter } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { ParchmentButton, ParchmentDialog } from './ParchmentDialog';

const BAJOS: Record<Bajo, { title: string; paragraphs: string[]; button: string }> = {
  1: {
    title: 'Caíste en primer bajo',
    paragraphs: [
      'Perdiste una estrella. Como un primer bajo rendimiento en la universidad, todavía estás a tiempo de recuperarte.',
      'Vuelves al inicio de este desafío y conservas todo lo que has logrado. Te quedan dos estrellas.',
    ],
    button: 'Seguir adelante',
  },
  2: {
    title: 'Caíste en segundo bajo',
    paragraphs: [
      'Perdiste otra estrella. Un segundo bajo rendimiento te obliga a repetir el camino.',
      'Vuelves a Villa de Boj y la aventura empieza desde cero: tendrás que volver a pedir ayuda, recoger los objetos y superar cada desafío otra vez. Te queda una sola estrella.',
    ],
    button: 'Empezar de nuevo',
  },
  3: {
    title: 'Caíste en tercer bajo',
    paragraphs: [
      'Perdiste tu última estrella. Con tres bajos rendimientos ya no puedes continuar en la misma carrera.',
      'Tu aventura termina aquí: elige un nuevo personaje y comienza desde el principio, con tres estrellas.',
    ],
    button: 'Elegir otro personaje',
  },
};

// Explains the "bajo" just suffered (see challenges/progression.ts). After the third one, closing it forgets the
// character: the onboarding then takes the player to the character selection.
export function BajoDialog() {
  const dialog = useUIStore((state) => state.dialog);
  const bajo = ([1, 2, 3] as const).find((level) => dialog === bajoDialog(level));
  if (!bajo) return null;
  const { title, paragraphs, button } = BAJOS[bajo];

  const close = () => {
    useUIStore.getState().closeDialog();
    if (bajo !== 3) return;
    const user = useAuthStore.getState().user;
    usePlayerStore.getState().reset();
    useAuthStore.getState().updateUser({ nickname: undefined, avatarName: undefined, gender: undefined });
    if (user) clearCharacter(user.uid).catch((error) => console.error('Could not clear the character:', error));
  };

  return (
    <ParchmentDialog title={title} subtitle="Bajo rendimiento" paragraphs={paragraphs}>
      <div className="flex justify-end">
        <ParchmentButton tone={bajo === 3 ? 'decline' : 'accept'} onClick={close}>
          {button}
        </ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
