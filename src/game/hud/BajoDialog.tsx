import { bajoDialog, VIDA_EXTRA_DIALOG, type Bajo } from '@/game/challenges/progression';
import { usePlayerStore } from '@/game/player/playerStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { ParchmentDialog } from './ParchmentDialog';

const BAJOS: Record<Bajo, { title: string; paragraphs: string[] }> = {
  1: {
    title: 'Caíste en primer bajo',
    paragraphs: [
      'Perdiste una estrella. Como un primer bajo rendimiento en la universidad, todavía estás a tiempo de recuperarte.',
      'Vuelves al inicio de este desafío y conservas todo lo que has logrado. Te quedan dos estrellas.',
    ],
  },
  2: {
    title: 'Caíste en segundo bajo',
    paragraphs: [
      'Perdiste otra estrella. Un segundo bajo rendimiento te obliga a repetir el camino.',
      'Vuelves a la Villa de Boj y la aventura empieza desde cero: tendrás que volver a pedir ayuda, recoger los objetos y superar cada desafío otra vez. Te queda una sola estrella.',
    ],
  },
  3: {
    title: 'Caíste en tercer bajo',
    paragraphs: [
      'Perdiste tu última estrella. Acabas de perder: ya no puedes volver a jugar con este personaje.',
      'Puedes volver a entrar, pero tienes que escoger otro personaje y comenzar desde cero, con tres estrellas.',
    ],
  },
};

const VIDA_EXTRA = {
  title: 'Perdiste una estrella extra',
  paragraphs: [
    'Te derrotaron, pero la estrella que ganaste con un bono te salvó: no caes en bajo rendimiento.',
    'Las estrellas que tenías en ese momento no se afectan. Vuelves al inicio de este desafío y conservas todo lo que has logrado.',
  ],
};

// Explains the "bajo" just suffered (see challenges/progression.ts). After the third one, closing it forgets the
// character and records it as lost for good: the onboarding then takes the player to choose a different one.
export function BajoDialog() {
  const dialog = useUIStore((state) => state.dialog);
  const bajo = ([1, 2, 3] as const).find((level) => dialog === bajoDialog(level));
  const extra = dialog === VIDA_EXTRA_DIALOG;
  if (!bajo && !extra) return null;
  const { title, paragraphs } = bajo ? BAJOS[bajo] : VIDA_EXTRA;
  const voice = bajo ? `05_narrador_0${bajo}` : '05_narrador_04';

  const close = () => {
    useUIStore.getState().closeDialog();
    if (bajo !== 3) return;
    const user = useAuthStore.getState().user;
    usePlayerStore.getState().reset();
    if (!user) return;
    const lostCharacters = user.avatarName ? [...new Set([...(user.lostCharacters ?? []), user.avatarName])] : user.lostCharacters;
    useAuthStore.getState().updateUser({ nickname: undefined, avatarName: undefined, gender: undefined, lostCharacters });
  };

  return (
    <ParchmentDialog title={title} subtitle={bajo ? 'Bajo rendimiento' : 'Estrella extra de un bono'} paragraphs={paragraphs} voice={[voice]} onClose={close} />
  );
}
