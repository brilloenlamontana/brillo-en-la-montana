import { useGLTF, useAnimations, Html } from '@react-three/drei'
import { RigidBody, CapsuleCollider, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { useUIStore } from '../../../../store/uiStore'
import { useInteractKey } from '../../../../hooks/useInteractKey'
import { isBodyNamed, PLAYER_BODY_NAME } from '../../../../constants/bodies'
import { InteractionPrompt } from '../../../ui/InteractionPrompt'
import { ImeriModal } from './ImeriModal'

// Sensor plano sobre el piso frente a Imeri, en sus coordenadas locales (+z es hacia donde mira).
const TALK_SENSOR_POSITION: [number, number, number] = [0, 0.6, 1]
const TALK_SENSOR_HALF_EXTENTS: [number, number, number] = [2.5, 0.6, 2.5]

const isPlayer = (payload: IntersectionEnterPayload) => isBodyNamed(payload.other.rigidBody?.userData, PLAYER_BODY_NAME)

export function Imeri(props: any) {
  const group = useRef<THREE.Group>(null)
  const { nodes, materials, animations } = useGLTF('/models-3d/npcs/Imeri.glb')
  const { actions } = useAnimations(animations, group)

  const isModalOpen = useUIStore((state) => state.isImeriModalOpen)
  const setModalOpen = useUIStore((state) => state.setImeriModalOpen)
  const [playerNearby, setPlayerNearby] = useState(false)
  const canTalk = playerNearby && !isModalOpen

  const startConversation = useCallback(() => {
    if (canTalk) setModalOpen(true)
  }, [canTalk, setModalOpen])

  useInteractKey(canTalk, startConversation)

  useEffect(() => {
    const currentAction = actions.Idle_Breathing
    currentAction?.reset().fadeIn(0.2).play()
    return () => {
      currentAction?.fadeOut(0.2)
    }
  }, [actions])

  return (
    <RigidBody type="fixed" colliders={false} {...props}>
      <CapsuleCollider args={[0.5, 0.35]} position={[0, 0.85, 0]} />
      <CuboidCollider
        sensor
        args={TALK_SENSOR_HALF_EXTENTS}
        position={TALK_SENSOR_POSITION}
        onIntersectionEnter={(payload) => isPlayer(payload) && setPlayerNearby(true)}
        onIntersectionExit={(payload) => isPlayer(payload) && setPlayerNearby(false)}
      />
      <group
        ref={group}
        dispose={null}
        onClick={(event) => {
          event.stopPropagation()
          startConversation()
        }}
      >
        {canTalk && (
          <Html position={[0, 2.3, 0]} center>
            <InteractionPrompt action="hablar con Imeri" onActivate={startConversation} />
          </Html>
        )}
        {/* <Html fullscreen> sigue la posición en pantalla de Imeri; el portal deja el modal fijo sobre toda la pantalla. */}
        <Html>{createPortal(<ImeriModal />, document.body)}</Html>
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
