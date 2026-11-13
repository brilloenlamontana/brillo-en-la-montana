import { Html, useGLTF } from '@react-three/drei';
import type { Zone } from '@/game/engine/geometry/zone';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { PROMPT_Z_RANGE } from '@/game/engine/interaction/promptLayer';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { usePlayerNear } from '@/game/engine/interaction/usePlayerNear';
import { StaticModel } from '@/game/engine/models/StaticModel';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { useDialogOpen } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';
import { openCartaAlcalde } from './openCartaAlcalde';

const URL = DESAFIO1_MODELS.villaDeBoj.tablonAnuncio;
// The notice board stands beside the Villa de Boj gate, in front of the palisade, facing whoever arrives (+x); the
// mayor's announcement is nailed to it ("TablonAnuncio" collection of Map.blend).
const TABLON: readonly ColliderBox[] = [{ id: 'tablon-anuncio', position: [-51.4, 11.75, 19.9], args: [0.2, 1.15, 0.85] }];
// It is read from in front of it.
const READ_ZONE: Zone = { center: [-50.2, 19.9], enterRadius: 2.6, exitRadius: 3.2 };
const PROMPT_POSITION: [number, number, number] = [-51.2, 13.2, 19.9];

// The mayor's announcement, nailed to the notice board by the gate: read it by walking up to it (E, or the button on
// phones) or by tapping it, as often as wanted.
export function CartaAlcalde() {
  const visible = useVisibleFrom(VISIBLE_FROM.cartaAlcalde);
  const isOpen = useDialogOpen(DIALOG.cartaAlcalde);
  const playerNear = usePlayerNear(READ_ZONE);

  // It never opens by itself: only with E (or the prompt / a tap) next to the board.
  useInteractKey(playerNear && !isOpen, openCartaAlcalde);

  return (
    <group name="CartaAlcalde">
      <group
        visible={visible}
        onClick={(event) => {
          if (!playerNear) return;
          event.stopPropagation();
          openCartaAlcalde();
        }}
      >
        <StaticModel url={URL} />
      </group>
      <CuboidColliders boxes={TABLON} />
      {visible && playerNear && !isOpen && (
        <Html zIndexRange={PROMPT_Z_RANGE} position={PROMPT_POSITION} center>
          <InteractionPrompt action="leer el anuncio" onActivate={openCartaAlcalde} />
        </Html>
      )}
    </group>
  );
}

useGLTF.preload(URL);
