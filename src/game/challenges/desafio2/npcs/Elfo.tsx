import { useGLTF } from '@react-three/drei';
import { Npc } from '@/game/engine/interaction/Npc';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO2_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { isElfoPresent } from '../mission';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO2_MODELS.elfo;
// At the foot of the giant tree's staircase, facing the valley (+z).
const POSITION: [number, number, number] = [-36.4, 10.2, -126.4];

// The elf wizard. He only waits at the foot of his tree once Challenge 1 is completed; before that the valley and the
// forest can be walked but he is not there. His dialog is ElfoDialog.
export function Elfo() {
  const visible = useVisibleFrom(VISIBLE_FROM.elfo);
  const warming = useWarmingHere(VISIBLE_FROM.elfo);
  const present = useProgressStore((state) => isElfoPresent(state.progress));
  const talking = useDialogOpen(DIALOG.elfo);

  return (
    <Npc
      url={URL}
      position={POSITION}
      rotationY={0}
      visible={warming || (present && visible)}
      present={present}
      talk={{ prompt: 'hablar con el elfo', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.elfo) }}
    />
  );
}

useGLTF.preload(URL);
