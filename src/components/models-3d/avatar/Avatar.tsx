import { useGLTF, useAnimations } from '@react-three/drei'

import { useFrame } from '@react-three/fiber'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useAvatarStore } from '../../../store/avatarStore'
import { useLodGeometry } from '../../../hooks/useLodGeometry'
import { playOnceAndHold } from '../../../utils/animation'

const FADE_SECONDS = 0.2
// La cámara siempre está a ~2 m: el modelo de ~43 mil triángulos (LOD1, `npm run lods`) se ve igual que el original de
// 215 mil y cuesta cinco veces menos. El LOD2 queda para cuando se mira desde lejos.
const AVATAR_LOD_DISTANCES = [0, 15]

export function Avatar(props: any) {
  const avatarRef = useRef<THREE.Group>(null)

  // Selectores: así la avatar no se vuelve a renderizar cuando cambia la vida u otro campo del store.
  const avatarName = useAvatarStore((state) => state.avatarName)
  const action = useAvatarStore((state) => state.action)

  const genderFolder = 'woman'; // Solo hay animaciones de 'woman' en public/

  // El modelo original solo sirve de fuente para `npm run lods`; el juego carga sus niveles (mismo esqueleto y textura).
  const { nodes, materials } = useGLTF(`/models-3d/avatars/${avatarName}_LOD1.glb`) as any
  const lod2 = useGLTF(`/models-3d/avatars/${avatarName}_LOD2.glb`) as any
  const meshRef = useRef<THREE.SkinnedMesh>(null)
  const lodGeometries = useMemo(() => [nodes.Avatar.geometry, lod2.nodes.Avatar.geometry], [nodes, lod2])
  useLodGeometry(meshRef, lodGeometries, AVATAR_LOD_DISTANCES)

  const { animations: idleAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Idle.glb`) as any
  const { animations: walkAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Walking.glb`) as any
  const { animations: runAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Running.glb`) as any
  const { animations: deathAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Death.glb`) as any

  const allAnimations = useMemo(() => {
    const clips: THREE.AnimationClip[] = [];
    if (idleAnim?.length) {
      const clip = idleAnim[0].clone();
      clip.name = 'Idle';
      clips.push(clip);
    }
    if (walkAnim?.length) {
      const clip = walkAnim[0].clone();
      clip.name = 'Walking';
      clips.push(clip);
    }
    if (runAnim?.length) {
      const clip = runAnim[0].clone();
      clip.name = 'Running';
      clips.push(clip);
    }
    if (deathAnim?.length) {
      const clip = deathAnim[0].clone();
      clip.name = 'Death';
      clips.push(clip);
    }
    return clips;
  }, [idleAnim, walkAnim, runAnim, deathAnim]);

  const { actions } = useAnimations(allAnimations, avatarRef)

  useEffect(() => {
    if (actions.Death) playOnceAndHold(actions.Death);
  }, [actions]);

  // Fundido cruzado entre la animación anterior y la nueva (Idle, Walking, Running, Death).
  useEffect(() => {
    const currentAction = actions[action];
    currentAction?.reset().fadeIn(FADE_SECONDS).play()
    return () => {
      currentAction?.fadeOut(FADE_SECONDS)
    }
  }, [action, actions]);

  // Posición del jugador en cada cuadro, sin re-renders ni crear objetos nuevos (la usan zonas, enemigos y objetos).
  useFrame(() => {
    avatarRef.current?.getWorldPosition(useAvatarStore.getState().playerPosition);
  });

  return (
    <group ref={avatarRef} dispose={null} {...props}>
      <group rotation={[Math.PI / 2, 0 , 0]} scale={0.01}>
        <skinnedMesh
          ref={meshRef}
          geometry={lodGeometries[0]}
          material={materials.AvatarMaterial}
          skeleton={nodes.Avatar.skeleton}
        />
        <primitive object={nodes.mixamorigHips} />
      </group>
    </group>
  )
}
