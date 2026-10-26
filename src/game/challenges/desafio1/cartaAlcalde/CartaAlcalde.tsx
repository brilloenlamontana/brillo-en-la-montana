import { Float, Html, useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import type { Zone } from '@/game/engine/geometry/zone';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { usePlayerNear } from '@/game/engine/interaction/usePlayerNear';
import { useVisibleFrom } from '@/game/world/visibility';
import { useDialogOpen } from '@/store/uiStore';
import { DESAFIO1_MODELS } from '../assets';
import { DIALOG } from '../dialogs';
import { VISIBLE_FROM } from '../visibility';
import { openCartaAlcalde } from './openCartaAlcalde';

const URL = DESAFIO1_MODELS.cartaAlcalde;
// Floats over the road in front of the Villa Boj gate, facing whoever arrives (+x).
const POSITION: [number, number, number] = [-46, 11.8, 16.6];
const ROTATION_Y = -Math.PI / 2;
const READ_ZONE: Zone = { center: [POSITION[0], POSITION[2]], enterRadius: 3.5, exitRadius: 4.5 };

// The mayor's announcement: read it by walking up to it (E, or the button on phones) or by tapping it.
export function CartaAlcalde() {
  const { scene } = useGLTF(URL);
  const visible = useVisibleFrom(VISIBLE_FROM.cartaAlcalde);
  const isOpen = useDialogOpen(DIALOG.cartaAlcalde);
  const playerNear = usePlayerNear(READ_ZONE);

  useInteractKey(playerNear && !isOpen, openCartaAlcalde);

  return (
    <group name="CartaAlcalde" visible={visible}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={2} floatingRange={[-0.1, 0.1]}>
        <RigidBody type="fixed" colliders="cuboid">
          <group
            position={POSITION}
            rotation-y={ROTATION_Y}
            onClick={(event) => {
              event.stopPropagation();
              openCartaAlcalde();
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
          >
            <primitive object={scene} />
            {playerNear && !isOpen && (
              <Html position={[0, 1, 0]} center>
                <InteractionPrompt action="leer el anuncio" onActivate={openCartaAlcalde} />
              </Html>
            )}
          </group>
        </RigidBody>
      </Float>
    </group>
  );
}

useGLTF.preload(URL);
