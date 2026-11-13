import { useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useContando, useSalida } from '@/game/challenges/llegada';
import { Npc, type NpcEntrance, type NpcGait } from '@/game/engine/interaction/Npc';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO3_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { isUnlocked } from '../mission';
import { VISIBLE_FROM } from '../visibility';
import { HEDRIG_POSITION, LLEGADA, LLEGADA_SECONDS, SALE_ANTES } from './llegadaHedrig';

const URL = DESAFIO3_MODELS.hedrig;
// At her place she faces west: the path that comes out of the Dark Forest, so whoever arrives sees her face.
const ROTATION_Y = -1.75;
// Her way out: from the door of her house (its threshold is at 24.37) to the campfire.
const CAMINO: NpcEntrance['path'] = [
  [85.4, 24.37, -211.6],
  [84.5, 24.1, -209.6],
];
const PASO = 1.2;
const PIERNAS: NpcGait = { thighs: ['thighL', 'thighR'], shins: ['shinL', 'shinR'], stride: 0.8 };

// Hedrig, the dwarf miner. She is only there once the forest was crossed (Challenge 2 completed); before that the
// town can be reached but she is not. The first time the player arrives the story of the way is told
// (LlegadaHedrigDialog) and, as it ends, she comes out of her house to her campfire; after that she waits there. Her
// dialog is HedrigDialog.
export function Hedrig() {
  const visible = useVisibleFrom(VISIBLE_FROM.hedrig);
  const warming = useWarmingHere(VISIBLE_FROM.hedrig);
  const present = useProgressStore((state) => isUnlocked(state.progress));
  const talking = useDialogOpen(DIALOG.hedrig);
  // Still indoors: the story of the arrival is to be told, or is being told and she has not set off yet.
  const porContar = useProgressStore((state) => LLEGADA.pending(state.progress) && !state.progress.historiasContadas.includes(LLEGADA.id));
  const contando = useContando(LLEGADA.id);
  const sale = useSalida(LLEGADA.id, LLEGADA_SECONDS, SALE_ANTES);
  const [out, setOut] = useState(false);
  const state = !present || out ? 'out' : sale ? 'go' : porContar || contando ? 'inside' : 'out';

  return (
    <Npc
      url={URL}
      position={HEDRIG_POSITION}
      rotationY={ROTATION_Y}
      visible={warming || (present && visible)}
      present={present}
      animation={talking ? 'Talking' : 'Idle'}
      entrance={{ path: CAMINO, speed: PASO, state, onArrive: () => setOut(true) }}
      gait={PIERNAS}
      talk={{ prompt: 'hablar con Hedrig', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.hedrig) }}
    />
  );
}

useGLTF.preload(URL);
