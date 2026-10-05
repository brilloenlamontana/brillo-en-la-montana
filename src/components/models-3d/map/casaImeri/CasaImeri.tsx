import { Suspense, useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { CASA_IMERI_DOOR_ZONE, CASA_IMERI_INTERIOR_ZONE } from '../../../../constants/zones';
import { usePlayerNear } from '../../../../hooks/usePlayerNear';
import { useProgressStore } from '../../../../store/progressStore';
import { CameraColliderBoxes, type ColliderBox } from '../../CameraColliderBoxes';
import { HOUSE_POSITION, HOUSE_ROTATION_Y } from './houseFrame';
import { ImeriExterior } from './ImeriExterior';
import { ImeriInterior } from './ImeriInterior';
import { Recogibles } from './recogibles/Recogibles';

// Coordenadas locales de la casa (ver houseFrame.ts); args son medias extensiones (half-extents), medidas desde los GLB.
const SHELL_BOXES: ColliderBox[] = [
  { id: 'piso-porche', position: [-4.14, 10.3, -0.05], args: [1.06, 0.4, 3.65] },
  { id: 'rampa-escalera', position: [-5.615, 10.307, 0.2], args: [0.563, 0.1, 0.7], rotation: [0, 0, 0.583] },

  { id: 'baranda-frente-izq', position: [-5.1, 11.175, -2.075], args: [0.1, 0.475, 1.575] },
  { id: 'baranda-frente-der', position: [-5.1, 11.175, 2.25], args: [0.1, 0.475, 1.35] },
  { id: 'baranda-lado-izq', position: [-4.14, 11.175, -3.5], args: [1.06, 0.475, 0.1] },
  { id: 'baranda-lado-der', position: [-4.14, 11.175, 3.45], args: [1.06, 0.475, 0.1] },

  { id: 'pared-fondo', position: [2.975, 12.1, 0], args: [0.105, 1.7, 3.58] },
  { id: 'pared-izq', position: [0, 12.1, -3.465], args: [3.08, 1.7, 0.105] },
  { id: 'pared-der', position: [0, 12.1, 3.45], args: [3.08, 1.7, 0.13] },
  { id: 'pared-frente-izq', position: [-2.95, 12.1, -1.95], args: [0.13, 1.7, 1.62] },
  { id: 'pared-frente-der', position: [-2.95, 12.1, 2.15], args: [0.13, 1.7, 1.43] },
  { id: 'dintel-puerta', position: [-2.95, 13.33, 0.195], args: [0.13, 0.47, 0.525] },

  { id: 'maceta-porche', position: [-3.425, 11.095, -0.775], args: [0.325, 0.405, 0.305] },
  { id: 'maceta-suelo-izq', position: [-6.245, 10.445, -1.005], args: [0.355, 0.405, 0.275] },
  { id: 'maceta-suelo-der', position: [-6.21, 10.435, 1.405], args: [0.29, 0.405, 0.345] },
];

// Solo existen cuando Imeri ya recibió al jugador (la casa está desbloqueada).
const INTERIOR_BOXES: ColliderBox[] = [
  { id: 'piso-interior', position: [0, 10.35, 0], args: [3.08, 0.45, 3.58] },
  { id: 'cielo', position: [0.025, 13.65, -0.02], args: [2.85, 0.15, 3.34] },
  { id: 'baul', position: [-0.43, 11.355, -2.9], args: [1.37, 0.555, 0.46] },
  { id: 'barriles', position: [-2.42, 11.25, -2.96], args: [0.32, 0.45, 0.32] },
  { id: 'mesa', position: [-0.28, 11.22, 2.4], args: [1.15, 0.42, 0.52] },
];

const OPEN_DOOR_BOX: ColliderBox = { id: 'puerta-abierta', position: [-2.325, 11.805, -0.475], args: [0.545, 1.055, 0.145] };
const CLOSED_DOOR_BOX: ColliderBox = { id: 'puerta-cerrada', position: [-2.88, 11.83, 0.195], args: [0.2, 1.03, 0.53] };

// La cámara solo choca con paredes, techo y puerta; los muebles y macetas la acercarían de golpe sin necesidad.
const isCameraBlocker = ({ id }: ColliderBox) => /^(pared|dintel|cielo|puerta-cerrada)/.test(id);

export function CasaImeri(props: any) {
  // La puerta solo se abre después de hablar con Imeri; desde entonces se abre y se cierra sola al acercarse.
  const houseUnlocked = useProgressStore(
    (state) => state.progress.aldeanoHelp === 'accepted' && state.progress.interactedWithImeri === true,
  );
  const playerNearHouse = usePlayerNear(CASA_IMERI_INTERIOR_ZONE);
  const playerAtDoor = usePlayerNear(CASA_IMERI_DOOR_ZONE);
  const doorOpen = houseUnlocked && playerAtDoor;
  const showInterior = houseUnlocked && playerNearHouse;

  const { houseBoxes, cameraBoxes } = useMemo(() => {
    const boxes = [...SHELL_BOXES, ...(houseUnlocked ? INTERIOR_BOXES : []), doorOpen ? OPEN_DOOR_BOX : CLOSED_DOOR_BOX];
    return { houseBoxes: boxes, cameraBoxes: boxes.filter(isCameraBlocker) };
  }, [houseUnlocked, doorOpen]);

  return (
    <group name="CasaImeri" {...props}>
      <ImeriExterior doorOpen={doorOpen} />
      {showInterior && (
        <Suspense fallback={null}>
          <ImeriInterior />
          <Recogibles />
        </Suspense>
      )}
      <RigidBody type="fixed" colliders={false} position={HOUSE_POSITION} rotation={[0, HOUSE_ROTATION_Y, 0]}>
        {houseBoxes.map(({ id, position, args, rotation }) => (
          <CuboidCollider key={id} position={position} args={args} rotation={rotation} />
        ))}
        <CameraColliderBoxes boxes={cameraBoxes} />
      </RigidBody>
    </group>
  );
}
