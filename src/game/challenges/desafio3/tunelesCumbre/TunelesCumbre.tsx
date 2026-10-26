import { useGLTF } from '@react-three/drei';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';

const { estructura: ESTRUCTURA_URL, objetos: OBJETOS_URL } = DESAFIO3_MODELS.tunelesCumbre;
// TunelGalerias is the whole tunnel (floor, walls, ceiling): its ramps and the crevasse are walked on it. The stairs and
// the ogre platform sit on that ramped floor, so they are only visual. The bridge spans the crevasse.
const COLLIDERS = ['TunelGalerias', 'TunelPuente', 'TunelBocaEntrada', 'TunelBocaSalida', 'TunelMarcos'] as const;
const CAMERA_BLOCKERS = ['TunelGalerias'] as const;

// "TunelesCumbre" collection of Map.blend: spiral tunnels inside the Summit of Desolation, from the mine mouth in
// Hedrig's town up to the peak.
export function TunelesCumbre() {
  const estructuraVisible = useVisibleFrom(VISIBLE_FROM.tuneles);
  const objetosVisibles = useVisibleFrom(VISIBLE_FROM.tunelesObjetos);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.tuneles);

  return (
    <group name="TunelesCumbre">
      <StaticModel url={ESTRUCTURA_URL} visible={estructuraVisible} colliders={COLLIDERS} cameraBlockers={CAMERA_BLOCKERS} cameraActive={cameraActive} />
      <StaticModel url={OBJETOS_URL} visible={objetosVisibles} merge />
    </group>
  );
}

useGLTF.preload([ESTRUCTURA_URL, OBJETOS_URL]);
