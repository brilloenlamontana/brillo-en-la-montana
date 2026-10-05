import { useGLTF, useAnimations, Html } from '@react-three/drei'
import { RigidBody, CapsuleCollider, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { useUIStore } from '../../../../store/uiStore'
import { useProgressStore } from '../../../../store/progressStore'
import { useInteractKey } from '../../../../hooks/useInteractKey'
import { isBodyNamed, PLAYER_BODY_NAME } from '../../../../constants/bodies'
import { InteractionPrompt } from '../../../ui/InteractionPrompt'
import { AldeanoModal } from './AldeanoModal'

// Sensor plano sobre el piso frente al aldeano, en sus coordenadas locales (+z es hacia donde mira).
const TALK_SENSOR_POSITION: [number, number, number] = [0, 0.6, 1]
const TALK_SENSOR_HALF_EXTENTS: [number, number, number] = [2.5, 0.6, 2.5]

const isPlayer = (payload: IntersectionEnterPayload) => isBodyNamed(payload.other.rigidBody?.userData, PLAYER_BODY_NAME)

export function Aldeano(props: any) {
  const group = useRef<THREE.Group>(null)
  const { nodes, materials, animations } = useGLTF('/models-3d/npcs/Aldeano.glb')
  const { actions } = useAnimations(animations, group)

  const isModalOpen = useUIStore((state) => state.isAldeanoModalOpen)
  const setModalOpen = useUIStore((state) => state.setAldeanoModalOpen)
  const aldeanoHelp = useProgressStore((state) => state.progress.aldeanoHelp)

  const [playerNearby, setPlayerNearby] = useState(false)
  // Tras responder NO, el aldeano vuelve a ofrecer ayuda solo cuando el jugador se va y regresa.
  const [askedThisVisit, setAskedThisVisit] = useState(false)
  const canTalk = playerNearby && !askedThisVisit && aldeanoHelp !== 'accepted'

  const startConversation = useCallback(() => {
    if (!canTalk) return
    setAskedThisVisit(true)
    setModalOpen(true)
  }, [canTalk, setModalOpen])

  useEffect(() => {
    const action = (isModalOpen && actions.Talking) || actions.Idle
    action?.reset().fadeIn(0.2).play()
    return () => {
      action?.fadeOut(0.2)
    }
  }, [actions, isModalOpen])

  useInteractKey(canTalk, startConversation)

  return (
    <RigidBody type="fixed" colliders={false} {...props}>
      <CapsuleCollider args={[0.5, 0.35]} position={[0, 0.85, 0]} />
      <CuboidCollider
        sensor
        args={TALK_SENSOR_HALF_EXTENTS}
        position={TALK_SENSOR_POSITION}
        onIntersectionEnter={(payload) => isPlayer(payload) && setPlayerNearby(true)}
        onIntersectionExit={(payload) => {
          if (!isPlayer(payload)) return
          setPlayerNearby(false)
          setAskedThisVisit(false)
        }}
      />
      <group
        ref={group}
        dispose={null}
        onClick={(event) => {
          event.stopPropagation()
          startConversation()
        }}
        onPointerEnter={() => {
          if (canTalk) document.body.style.cursor = 'pointer'
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'default'
        }}
      >
        {canTalk && !isModalOpen && (
          <Html position={[0, 2.3, 0]} center>
            <InteractionPrompt action="interactuar" onActivate={startConversation} />
          </Html>
        )}
        {/* <Html fullscreen> sigue la posición en pantalla del aldeano; el portal deja el modal fijo sobre toda la pantalla. */}
        <Html>{createPortal(<AldeanoModal />, document.body)}</Html>
        <group name="Aldeano">
          <skinnedMesh
            name="Body"
            geometry={(nodes.Body as THREE.SkinnedMesh).geometry}
            material={materials.AldeanoMaterial}
            skeleton={(nodes.Body as THREE.SkinnedMesh).skeleton}
            frustumCulled={false}
          />
          <primitive object={nodes.mixamorigHips} />
        </group>
      </group>
    </RigidBody>
  )
}

useGLTF.preload('/models-3d/npcs/Aldeano.glb')
