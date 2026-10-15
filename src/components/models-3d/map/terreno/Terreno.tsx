import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import type { Object3D } from 'three';
import { TERRAIN_BODY_NAME } from '../../../../constants/bodies';

// Montañas que rodean el valle: solo se dibujan (los límites del mapa ya impiden subirlas).
const MONTANAS_URL = '/models-3d/map/Terreno/Terreno.glb';
// Suelo del valle: se dibuja y es el piso físico. Tiene un hueco sobre cada pozo del pantano.
const CAMINABLE_URL = '/models-3d/map/Terreno/TerrenoCaminable.glb';
// Paredes invisibles en el borde del área caminable.
const LIMITE_URL = '/models-3d/map/LimitesJuego/LimiteMapa.glb';

// Objeto estable: si cambia entre renders, @react-three/rapier reaplica las opciones del cuerpo en cada render.
const TERRAIN_USER_DATA = { name: TERRAIN_BODY_NAME };

// Son fijos: no hace falta recalcular sus matrices en cada cuadro.
function freeze(scene: Object3D) {
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    object.matrixAutoUpdate = false;
  });
}

export function Terreno() {
  const { scene: montanas } = useGLTF(MONTANAS_URL);
  const { scene: suelo } = useGLTF(CAMINABLE_URL);
  const { scene: limite } = useGLTF(LIMITE_URL);

  useLayoutEffect(() => {
    freeze(montanas);
    freeze(suelo);
  }, [montanas, suelo]);

  return (
    <>
      <primitive object={montanas} />
      {/* El nombre deja que el golem y los zumbadores encuentren el piso con useTerrainHeight. */}
      <RigidBody type="fixed" colliders="trimesh" userData={TERRAIN_USER_DATA}>
        <primitive object={suelo} />
      </RigidBody>
      <RigidBody type="fixed" colliders="trimesh" includeInvisible>
        <primitive object={limite} visible={false} />
      </RigidBody>
    </>
  );
}

useGLTF.preload([MONTANAS_URL, CAMINABLE_URL, LIMITE_URL]);
