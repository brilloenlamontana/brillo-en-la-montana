import { useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useContando, useSalida } from '@/game/challenges/llegada';
import { Npc, type NpcEntrance, type NpcGait } from '@/game/engine/interaction/Npc';
import { useVisibleFrom, useWarmingHere } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO2_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { isElfoPresent } from '../mission';
import { VISIBLE_FROM } from '../visibility';
import { STAIR_PATH } from '../casaDelElfo/elfoColliders';
import { ELFO_POSITION, LLEGADA, LLEGADA_SECONDS, SALE_ANTES } from './llegadaElfo';

const URL = DESAFIO2_MODELS.elfo;
// His way down: from the deck of his house along the spiral staircase (its own centerline, top to bottom) and round
// the west side of the trunk to his place.
const CAMINO: NpcEntrance['path'] = [
  ...[...STAIR_PATH].reverse(),
  [-43.9, 10.2, -140.4],
  [-44.8, 10.2, -136.6],
  [-43.2, 10.2, -131.5],
];
const PASO = 2.3;
const PIERNAS: NpcGait = { thighs: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg'], shins: ['mixamorigLeftLeg', 'mixamorigRightLeg'], stride: 1.5 };

// The elf wizard. He is only there once Challenge 1 is completed; before that the valley and the forest can be walked
// but he is not. The first time the player arrives the story of the way is told (LlegadaElfoDialog) and, as it ends,
// he comes down the stairs of his tree to his place; after that he waits there. His dialog is ElfoDialog.
export function Elfo() {
  const visible = useVisibleFrom(VISIBLE_FROM.elfo);
  const warming = useWarmingHere(VISIBLE_FROM.elfo);
  const present = useProgressStore((state) => isElfoPresent(state.progress));
  const talking = useDialogOpen(DIALOG.elfo);
  // Still up in his house: the story of the arrival is to be told, or is being told and he has not set off yet.
  const porContar = useProgressStore((state) => LLEGADA.pending(state.progress) && !state.progress.historiasContadas.includes(LLEGADA.id));
  const contando = useContando(LLEGADA.id);
  const sale = useSalida(LLEGADA.id, LLEGADA_SECONDS, SALE_ANTES);
  const [out, setOut] = useState(false);
  const state = !present || out ? 'out' : sale ? 'go' : porContar || contando ? 'inside' : 'out';

  return (
    <Npc
      url={URL}
      position={ELFO_POSITION}
      rotationY={0}
      visible={warming || (present && visible)}
      present={present}
      entrance={{ path: CAMINO, speed: PASO, state, onArrive: () => setOut(true) }}
      gait={PIERNAS}
      talk={{ prompt: 'hablar con el elfo', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.elfo) }}
    />
  );
}

useGLTF.preload(URL);
