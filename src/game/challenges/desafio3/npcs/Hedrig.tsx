import { useGLTF } from '@react-three/drei';
import { Npc } from '@/game/engine/interaction/Npc';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO3_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { isUnlocked } from '../mission';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO3_MODELS.hedrig;
// Outside, beside the campfire in front of her house (ground at 23.4), facing whoever arrives at her door.
const POSITION: [number, number, number] = [82.6, 23.42, -206.3];
const ROTATION_Y = 3.0;

// Hedrig, the dwarf miner. She waits by her campfire once the forest was crossed (Challenge 2 completed); before that
// the town can be reached but she is not there. Her dialog is HedrigDialog.
export function Hedrig() {
  const visible = useVisibleFrom(VISIBLE_FROM.hedrig);
  const warming = useWarmingHere(VISIBLE_FROM.hedrig);
  const present = useProgressStore((state) => isUnlocked(state.progress));
  const talking = useDialogOpen(DIALOG.hedrig);

  return (
    <Npc
      url={URL}
      position={POSITION}
      rotationY={ROTATION_Y}
      visible={warming || (present && visible)}
      present={present}
      animation={talking ? 'Talking' : 'Idle'}
      talk={{ prompt: 'hablar con Hedrig', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.hedrig) }}
    />
  );
}

useGLTF.preload(URL);
