import { useState } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Zone } from '@/game/engine/geometry/zone';
import { Npc, type NpcEntrance, type NpcGait } from '@/game/engine/interaction/Npc';
import { usePlayerNear } from '@/game/engine/interaction/usePlayerNear';
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
// She comes out of her house when the player gets this close: from her door (the porch is at 10.75) down to her place.
const SALE: Zone = { center: [POSITION[0], POSITION[2]], enterRadius: 16, exitRadius: 18 };
const CAMINO: NpcEntrance['path'] = [
  [18, 10.75, 43.3],
  [16.6, 10.5, 42.4],
];
const PASO = 1.5;
const PIERNAS: NpcGait = { thighs: ['DEF-thighL', 'DEF-thighR'], shins: ['DEF-shinL', 'DEF-shinR'], stride: 1.25 };

// Imeri, the hunter. She is only at home after the villager woman's help was accepted; until then she is mounted but
// absent, so her appearance loads and compiles nothing. The first time the player comes she walks out of her house to
// meet them (spoken to on an earlier visit, she already waits outside). Her dialog is ImeriDialog.
export function Imeri() {
  const visible = useVisibleFrom(VISIBLE_FROM.imeri);
  const warming = useWarmingHere(VISIBLE_FROM.imeri);
  const atHome = useProgressStore((state) => state.progress.aldeanoHelp === 'accepted');
  const talking = useDialogOpen(DIALOG.imeri);
  const met = useProgressStore((state) => state.progress.interactedWithImeri);
  const near = usePlayerNear(SALE);
  // Out of the house already in this visit.
  const [out, setOut] = useState(false);
  const state = !atHome || met || out ? 'out' : near ? 'go' : 'inside';

  return (
    <Npc
      url={URL}
      position={POSITION}
      rotationY={ROTATION_Y}
      visible={warming || (atHome && visible)}
      present={atHome}
      entrance={{ path: CAMINO, speed: PASO, state, onArrive: () => setOut(true) }}
      gait={PIERNAS}
      talk={{ prompt: 'hablar con Imeri', enabled: !talking, onTalk: () => useUIStore.getState().openDialog(DIALOG.imeri) }}
    />
  );
}

useGLTF.preload(URL);
