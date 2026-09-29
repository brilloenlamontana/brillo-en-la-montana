import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { Card } from './Card'

type MapGLTF = {
  nodes: {
    Pantano: THREE.Mesh
    Terreno: THREE.Mesh
    VillaBoj_1: THREE.Mesh
    VillaBoj_2: THREE.Mesh
    VillaBoj_3: THREE.Mesh
    VillaBoj_4: THREE.Mesh
    VillaBoj_5: THREE.Mesh
    VillaBoj_6: THREE.Mesh
    VillaBoj_7: THREE.Mesh
    VillaBoj_8: THREE.Mesh
    VillaBoj_9: THREE.Mesh
  }
  materials: Record<string, THREE.Material>
}

export function Map(props: any) {
  const { nodes, materials } = useGLTF('/models-3d/world/Map.glb') as unknown as MapGLTF
  return (
    <>
      <Card />
      <RigidBody type='fixed' colliders='trimesh'>
        <group {...props} dispose={null}>
          <mesh geometry={nodes.Pantano.geometry} material={materials.PantanoMaterial} />
          <mesh geometry={nodes.Terreno.geometry} material={materials.TerrenoMaterial} />
          <mesh geometry={nodes.VillaBoj_1.geometry} material={materials.BojPiedraOscura} />
          <mesh geometry={nodes.VillaBoj_2.geometry} material={materials.BojPiedra} />
          <mesh geometry={nodes.VillaBoj_3.geometry} material={materials.BojTejado} />
          <mesh geometry={nodes.VillaBoj_4.geometry} material={materials.BojMadera} />
          <mesh geometry={nodes.VillaBoj_5.geometry} material={materials.BojVano} />
          <mesh geometry={nodes.VillaBoj_6.geometry} material={materials.BojMaderaOscura} />
          <mesh geometry={nodes.VillaBoj_7.geometry} material={materials.BojTejadoOscuro} />
          <mesh geometry={nodes.VillaBoj_8.geometry} material={materials.BojHierro} />
          <mesh geometry={nodes.VillaBoj_9.geometry} material={materials.BojRevoque} />
        </group>
      </RigidBody>
    </>

  )
}

useGLTF.preload('/models-3d/world/Map.glb')
