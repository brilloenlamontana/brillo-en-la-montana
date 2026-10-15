import { useGLTF, useAnimations, Html } from '@react-three/drei'
import { RigidBody, CapsuleCollider, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useUIStore } from '../../../../store/uiStore'
import { useProgressStore } from '../../../../store/progressStore'
import { useInteractKey } from '../../../../hooks/useInteractKey'
import { useLodGeometry } from '../../../../hooks/useLodGeometry'
import { isBodyNamed, PLAYER_BODY_NAME } from '../../../../constants/bodies'
import { InteractionPrompt } from '../../../ui/InteractionPrompt'

// Sensor plano sobre el piso frente al aldeano, en sus coordenadas locales (+z es hacia donde mira).
const TALK_SENSOR_POSITION: [number, number, number] = [0, 0.6, 1]
const TALK_SENSOR_HALF_EXTENTS: [number, number, number] = [2.5, 0.6, 2.5]
const FADE_SECONDS = 0.25
// El original (~200 mil triángulos) solo es la fuente de `npm run lods`: cerca se usa el LOD1 (~40 mil, se ve igual)
// y de lejos el LOD2 (~10 mil); comparten esqueleto, animaciones y textura.
const ALDEANO_LOD_URLS = ['/models-3d/npcs/Aldeano_LOD1.glb', '/models-3d/npcs/Aldeano_LOD2.glb']
const ALDEANO_LOD_DISTANCES = [0, 15]

const isPlayer = (payload: IntersectionEnterPayload) => isBodyNamed(payload.other.rigidBody?.userData, PLAYER_BODY_NAME)

type AldeanoProps = { position: [number, number, number]; rotation: [number, number, number]; visible: boolean }

// Espera en la plaza de Villa Boj para preguntar si el jugador necesita ayuda (el diálogo es AldeanoModal, en WorldPage).
// Oculto (desde la casa de Imeri en adelante) no reproduce animaciones, así su esqueleto no cuesta nada.
export function Aldeano({ position, rotation, visible }: AldeanoProps) {
  const group = useRef<THREE.Group>(null)
  const [{ nodes, materials, animations }, lod2] = useGLTF(ALDEANO_LOD_URLS)
  const { actions } = useAnimations(animations, group)
  const bodyRef = useRef<THREE.SkinnedMesh>(null)
  const lodGeometries = useMemo(() => [(nodes.Body as THREE.SkinnedMesh).geometry, (lod2.nodes.Body as THREE.SkinnedMesh).geometry], [nodes, lod2])
  useLodGeometry(bodyRef, lodGeometries, ALDEANO_LOD_DISTANCES)

  const isModalOpen = useUIStore((state) => state.isAldeanoModalOpen)
  const setModalOpen = useUIStore((state) => state.setAldeanoModalOpen)
  const aldeanoHelp = useProgressStore((state) => state.progress.aldeanoHelp)

  const [playerNearby, setPlayerNearby] = useState(false)
  // Tras responder NO, el aldeano vuelve a ofrecer ayuda solo cuando el jugador se va y regresa.
  const [askedThisVisit, setAskedThisVisit] = useState(false)
  const canTalk = visible && playerNearby && !askedThisVisit && aldeanoHelp !== 'accepted'

  const startConversation = useCallback(() => {
    if (!canTalk) return
    setAskedThisVisit(true)
    setModalOpen(true)
  }, [canTalk, setModalOpen])

  // Talking mientras el diálogo está abierto e Idle el resto del tiempo, con fundido entre ambas.
  useEffect(() => {
    if (!visible) return
    const action = (isModalOpen && actions.Talking) || actions.Idle
    action?.reset().fadeIn(FADE_SECONDS).play()
    return () => {
      action?.fadeOut(FADE_SECONDS)
    }
  }, [actions, isModalOpen, visible])

  // Al ocultarlo se detienen sus animaciones; al volver a verlo, el efecto de arriba retoma Idle.
  useEffect(() => {
    if (visible) return
    Object.values(actions).forEach((action) => action?.stop())
  }, [actions, visible])

  useInteractKey(canTalk, startConversation)

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
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
        visible={visible}
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
        <group name="Aldeano">
          <skinnedMesh
            ref={bodyRef}
            name="Body"
            geometry={lodGeometries[0]}
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

useGLTF.preload(ALDEANO_LOD_URLS)
