import { useGLTF, Html } from '@react-three/drei'
import { RigidBody, CapsuleCollider, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useUIStore } from '../../../../store/uiStore'
import { useInteractKey } from '../../../../hooks/useInteractKey'
import { useLodGeometry } from '../../../../hooks/useLodGeometry'
import { isBodyNamed, PLAYER_BODY_NAME } from '../../../../constants/bodies'
import { InteractionPrompt } from '../../../ui/InteractionPrompt'

// Sensor plano sobre el piso frente a Imeri, en sus coordenadas locales (+z es hacia donde mira).
const TALK_SENSOR_POSITION: [number, number, number] = [0, 0.6, 1]
const TALK_SENSOR_HALF_EXTENTS: [number, number, number] = [2.5, 0.6, 2.5]

// El original (~200 mil triángulos) solo es la fuente de `npm run lods`: cerca se usa el LOD1 (~40 mil, se ve igual)
// y de lejos el LOD2 (~10 mil); comparten esqueleto, animaciones y textura.
const IMERI_LOD_URLS = ['/models-3d/npcs/Imeri_LOD1.glb', '/models-3d/npcs/Imeri_LOD2.glb']
const IMERI_LOD_DISTANCES = [0, 15]

const isPlayer = (payload: IntersectionEnterPayload) => isBodyNamed(payload.other.rigidBody?.userData, PLAYER_BODY_NAME)

type ImeriProps = {
  position: [number, number, number]
  rotation: [number, number, number]
  // Está en casa (el jugador aceptó la ayuda del aldeano): solo entonces choca y se puede hablar con ella.
  present: boolean
  visible: boolean
}

// Siempre montada: aparecer frente a su casa al aceptar la ayuda del aldeano solo enciende su visibilidad y sus colliders,
// sin cargar ni compilar nada en ese momento. El diálogo es ImeriModal, en WorldPage.
export function Imeri({ position, rotation, present, visible }: ImeriProps) {
  const [{ nodes, materials }, lod2] = useGLTF(IMERI_LOD_URLS)
  const bodyRef = useRef<THREE.Mesh>(null)
  const lodGeometries = useMemo(() => [(nodes.Body as THREE.Mesh).geometry, (lod2.nodes.Body as THREE.Mesh).geometry], [nodes, lod2])
  useLodGeometry(bodyRef, lodGeometries, IMERI_LOD_DISTANCES)

  const isModalOpen = useUIStore((state) => state.isImeriModalOpen)
  const setModalOpen = useUIStore((state) => state.setImeriModalOpen)
  const [playerNearby, setPlayerNearby] = useState(false)
  // Sin `present` el sensor no existe: no importa lo último que haya avisado.
  const canTalk = present && visible && playerNearby && !isModalOpen

  const startConversation = useCallback(() => {
    if (canTalk) setModalOpen(true)
  }, [canTalk, setModalOpen])

  useInteractKey(canTalk, startConversation)

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {present && (
        <>
          <CapsuleCollider args={[0.5, 0.35]} position={[0, 0.85, 0]} />
          <CuboidCollider
            sensor
            args={TALK_SENSOR_HALF_EXTENTS}
            position={TALK_SENSOR_POSITION}
            onIntersectionEnter={(payload) => isPlayer(payload) && setPlayerNearby(true)}
            onIntersectionExit={(payload) => isPlayer(payload) && setPlayerNearby(false)}
          />
        </>
      )}
      <group
        dispose={null}
        visible={visible}
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
        <group name="Imeri" dispose={null}>
          <mesh ref={bodyRef} geometry={lodGeometries[0]} material={materials.ImeriMaterial} />
        </group>
      </group>
    </RigidBody>
  )
}

useGLTF.preload(IMERI_LOD_URLS)
