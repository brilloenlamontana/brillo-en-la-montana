import { useGLTF } from '@react-three/drei';
import { Npc } from '@/game/engine/interaction/Npc';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO1_MODELS.imeri;
// In front of her house, on the porch path (ground at 10.27), facing the path that comes from the village.
const POSITION: [number, number, number] = [10.5, 10.27, 41.5];
const ROTATION_Y = -1.92;

// Imeri, the hunter. She only waits at home after the villager's help was accepted; until then she is mounted but
// absent, so her appearance loads and compiles nothing. Her dialog is ImeriDialog.
export function Imeri() {
  const visible = useVisibleFrom(VISIBLE_FROM.imeri);
  const warming = useWarmingHere(VISIBLE_FROM.imeri);
  const atHome = useProgressStore((state) => state.progress.aldeanoHelp === 'accepted');
  const talking = useDialogOpen(DIALOG.imeri);

  return (
    <Npc
      url={URL}
      position={POSITION}
      rotationY={ROTATION_Y}
      visible={warming || (atHome && visible)}
      present={atHome}
      talk={{ prompt: 'hablar con Imeri', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.imeri) }}
    />
  );
}

useGLTF.preload(URL);
