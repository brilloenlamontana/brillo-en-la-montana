import { currentChallenge, DEFEAT_DIALOG } from '@/game/challenges/progression';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { ParchmentButton, ParchmentDialog } from './ParchmentDialog';

const DEFAULT_MESSAGE = ['Perdiste tus tres estrellas. Descansa, recupéralas y vuelve a intentarlo.'];

// Shown after losing the last star: the challenge being played starts over.
export function DefeatDialog() {
  const isOpen = useDialogOpen(DEFEAT_DIALOG);
  const progress = useProgressStore((state) => state.progress);
  if (!isOpen) return null;

  const challenge = currentChallenge(progress);
  return (
    <ParchmentDialog title="Te quedaste sin estrellas" subtitle={challenge.title} paragraphs={challenge.restart?.message ?? DEFAULT_MESSAGE}>
      <div className="flex justify-end">
        <ParchmentButton onClick={() => useUIStore.getState().closeDialog()}>Volver a intentarlo</ParchmentButton>
      </div>
    </ParchmentDialog>
  );
}
