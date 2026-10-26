import { useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Npc } from '@/game/engine/interaction/Npc';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO1_MODELS.aldeano;
// In the Villa Boj square, in view right after crossing the gate (ground at 10.87), facing it.
const POSITION: [number, number, number] = [-72, 10.87, 15.5];
const ROTATION_Y = Math.PI / 2;

// The villager tells what happened and asks whether the player needs help (AldeanoDialog). After a NO he only asks
// again once the player walks away and comes back; after a YES he has nothing more to say.
export function Aldeano() {
  const visible = useVisibleFrom(VISIBLE_FROM.aldeano);
  const talking = useDialogOpen(DIALOG.aldeano);
  const accepted = useProgressStore((state) => state.progress.aldeanoHelp === 'accepted');
  const [askedThisVisit, setAskedThisVisit] = useState(false);

  return (
    <Npc
      url={URL}
      position={POSITION}
      rotationY={ROTATION_Y}
      visible={visible}
      animation={talking ? 'Talking' : 'Idle'}
      talk={{
        prompt: 'hablar con el aldeano',
        enabled: !accepted && !askedThisVisit && !talking,
        onTalk: () => {
          setAskedThisVisit(true);
          useUIStore.getState().openDialog(DIALOG.aldeano);
        },
        onLeave: () => setAskedThisVisit(false),
      }}
    />
  );
}

useGLTF.preload(URL);
