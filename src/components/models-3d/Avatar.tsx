import { useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useAvatarStore } from '../../store/avatarStore'

export function Avatar(props: any) {
  const avatarRef = useRef<THREE.Group>(null)
  
  const { avatarName, gender, action } = useAvatarStore();

  const genderFolder = gender === 'male' ? 'man' : 'woman';

  // Cargamos el mesh del avatar
  const { nodes, materials } = useGLTF(`/models-3d/avatars/${avatarName}.glb`) as any
  
  // Cargamos TODAS las animaciones simultáneamente para poder mezclarlas (crossfade) sin que se destruya el componente
  const { animations: idleAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Idle.glb`) as any
  const { animations: walkAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Walking.glb`) as any
  const { animations: runAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Running.glb`) as any
  const { animations: jumpAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Jumping.glb`) as any

  // Combinamos todos los clips en un solo arreglo y los renombramos para asegurar que coincidan con la variable `action`
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
    if (jumpAnim?.length) {
      const clip = jumpAnim[0].clone();
      clip.name = 'Jumping';
      clips.push(clip);
    }
    return clips;
  }, [idleAnim, walkAnim, runAnim, jumpAnim]);

  const { actions } = useAnimations(allAnimations, avatarRef)
  
  useEffect(() => {
    const currentAction = actions[action];
    // Una transición más rápida de 0.2s es ideal para juegos
    currentAction?.reset().fadeIn(0.2).play()
    return () => currentAction?.fadeOut(0.2) as any;
  }, [action, actions]);

  return (
    <group ref={avatarRef} dispose={null} {...props}>
      <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
        <skinnedMesh
          geometry={nodes.Avatar.geometry}
          material={materials.AvatarMaterial}
          skeleton={nodes.Avatar.skeleton}
        />
        <primitive object={nodes.mixamorigHips} />
      </group>
    </group>
  )
}
