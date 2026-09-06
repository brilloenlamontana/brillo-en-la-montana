import { useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

let avatarName, avatarAnimationName: string = "";


export function Avatar({ animation = 'Idle', avatarName = 'elfa', avatarAnimationName = "idle", ...props }: { animation?: string, [key: string]: any }) {
  const avatarRef = useRef<THREE.Group>(null)

  avatarName = avatarName;
  avatarAnimationName = avatarAnimationName;

  const { nodes, materials } = useGLTF(`/models-3d/avatars/${avatarName}.glb`) as any
  const { animations } = useGLTF(`/models-3d/animations/${avatarAnimationName}.glb`) as any
  const { actions } = useAnimations(animations, avatarRef)
  
  useEffect(() => {
    const action = actions[animation];
    action?.reset().fadeIn(0.5).play()
    return () => action?.fadeOut(0.5) as any;
  }, []);

  return (
    <group ref={avatarRef} dispose={null} {...props}>
      <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
        <skinnedMesh
          geometry={nodes.Avatar.geometry}
          material={materials.Avatar}
          skeleton={nodes.Avatar.skeleton}
        />
        <primitive object={nodes.mixamorigHips} />
      </group>
    </group>
  )
}

useGLTF.preload(`/models-3d/avatars/${avatarName}.glb`)
useGLTF.preload(`/models-3d/animations/${avatarAnimationName}.glb`)
