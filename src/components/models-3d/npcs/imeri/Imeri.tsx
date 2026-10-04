import { useGLTF, useAnimations } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function Imeri(props: any) {
  const group = useRef<THREE.Group>(null)
  const { nodes, materials, animations } = useGLTF('/models-3d/npcs/Imeri.glb')
  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const currentAction = actions.Idle_Breathing;
    currentAction?.reset().fadeIn(0.2).play()
    return () => currentAction?.fadeOut(0.2) as any;
  }, [actions]);

  return (
    <RigidBody type='fixed'>
      <group ref={group} {...props} dispose={null}>
        <group name="Scene">
          <group name="Imeri"> 
            <skinnedMesh
              name="Body"
              geometry={(nodes.Body as THREE.SkinnedMesh).geometry}
              material={materials.Material}
              skeleton={(nodes.Body as THREE.SkinnedMesh).skeleton}
            />
            <primitive object={nodes['MCH-foot_ikparentL']} />
            <primitive object={nodes['MCH-foot_ikparentR']} />
            <primitive object={nodes['MCH-hand_ikparentL']} />
            <primitive object={nodes['MCH-hand_ikparentR']} />
            <primitive object={nodes['MCH-thigh_ik_targetparentL']} />
            <primitive object={nodes['MCH-thigh_ik_targetparentR']} />
            <primitive object={nodes['MCH-torsoparent']} />
            <primitive object={nodes['MCH-upper_arm_ik_targetparentL']} />
            <primitive object={nodes['MCH-upper_arm_ik_targetparentR']} />
            <primitive object={nodes.root} />
          </group>
        </group>
      </group>
    </RigidBody>

  )
}

useGLTF.preload('/models-3d/npcs/Imeri.glb')
