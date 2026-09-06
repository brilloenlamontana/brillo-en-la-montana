import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export function Map() {
  const { scene } = useGLTF('/models-3d/world/Map.glb')
  return (
    <RigidBody type='fixed' colliders='trimesh'>
      <group dispose={null}>
        <primitive object={scene} />
      </group>
    </RigidBody>

  )
}

useGLTF.preload('/models-3d/world/Map.glb')
