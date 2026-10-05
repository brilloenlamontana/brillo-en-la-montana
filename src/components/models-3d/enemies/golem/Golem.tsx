import { useGLTF, useAnimations } from '@react-three/drei'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAvatarStore } from '../../../../store/avatarStore'
import { useEnemyStore } from '../../../../store/enemyStore'
import { useZoneStore } from '../../../../store/zoneStore'
import { usePantanoWells } from '../../../../hooks/usePantanoWells'
import { useTerrainHeight } from '../../../../hooks/useTerrainHeight'
import { playOnceAndHold } from '../../../../utils/animation'
import { pickWell, type Well } from '../../../../utils/wells'

type GolemState = 'hidden' | 'emerging' | 'chasing' | 'idle' | 'defeated'
type GolemAction = 'Walking' | 'Attack' | 'Knock' | "Idle"

const HIDDEN_Y = -60
const WALK_SPEED = 2.5
const CLIMB_SPEED = 2.5
const ATTACK_RANGE = 2.5 // distancia para empezar un golpe
const ATTACK_HIT_RANGE = 3.2 // el golpe conecta si el jugador sigue a esta distancia cuando llega el puño
const ATTACK_DAMAGE = 5 // 5 golpes vacían los 100 de vida
const ATTACK_ANIMATION_SPEED = 1.4 // el clip Attack dura 2.88 s; así cada golpe toma ~2 s
const ATTACK_HIT_MOMENT = 0.5 // fracción del golpe en la que el puño llega al jugador
const FADE_SECONDS = 0.3
const EMERGE_MIN_DISTANCE = 12
const MIN_WELL_RADIUS = 1.6 // el golem mide ~2.9 m de ancho con scale 2
const UP = new THREE.Vector3(0, 1, 0)

// Escondido en un pozo del pantano hasta que el jugador entra: sale del pozo más cercano a él y lo persigue.
// Cuando el jugador sale del pantano se queda quieto donde está (Idle) y retoma la persecución si vuelve.
// La gema de la mochila lo desactiva: cae con la animación Knock y se queda tendido.
export function Golem(props: any) {
  const group = useRef<THREE.Group>(null)
  const rb = useRef<RapierRigidBody>(null)
  const { nodes, materials, animations } = useGLTF('/models-3d/enemies/Golem.glb')
  const { actions } = useAnimations(animations, group)
  const wells = usePantanoWells()
  const terrainHeight = useTerrainHeight()

  const brain = useRef<{ state: GolemState; well: Well | null; swingStart: number | null; swingHit: boolean }>({
    state: 'hidden', well: null, swingStart: null, swingHit: false,
  })
  const position = useRef(new THREE.Vector3(0, HIDDEN_Y, 0))
  const facing = useRef(new THREE.Quaternion())
  const actionRef = useRef<GolemAction | null>(null)

  useEffect(() => {
    actions.Attack?.setEffectiveTimeScale(ATTACK_ANIMATION_SPEED)
    if (actions.Knock) playOnceAndHold(actions.Knock)
  }, [actions])

  const playAction = (next: GolemAction | null) => {
    if (actionRef.current === next) return
    if (actionRef.current) actions[actionRef.current]?.fadeOut(FADE_SECONDS)
    if (next) actions[next]?.reset().fadeIn(FADE_SECONDS).play()
    actionRef.current = next
  }

  const faceTowards = (dx: number, dz: number, delta: number) => {
    if (!group.current || Math.hypot(dx, dz) < 1e-3) return
    facing.current.setFromAxisAngle(UP, Math.atan2(dx, dz))
    group.current.quaternion.slerp(facing.current, Math.min(1, 10 * delta))
  }

  const walkTowards = (tx: number, tz: number, delta: number) => {
    const p = position.current
    const dx = tx - p.x
    const dz = tz - p.z
    const distance = Math.hypot(dx, dz)
    const step = Math.min(distance, WALK_SPEED * delta)
    if (distance > 1e-3) {
      p.x += (dx / distance) * step
      p.z += (dz / distance) * step
    }
    const ground = terrainHeight(p.x, p.z, p.y + 3, 8)
    if (ground !== null) p.y = THREE.MathUtils.damp(p.y, ground, 10, delta)
    faceTowards(dx, dz, delta)
    return distance
  }

  useFrame((state, rawDelta) => {
    if (!rb.current || !group.current) return
    const delta = Math.min(rawDelta, 0.1)
    const brainState = brain.current
    const p = position.current
    const player = useAvatarStore.getState().playerPosition
    const playerInPantano = useZoneStore.getState().insidePantano
    let action: GolemAction | null = 'Walking'
    const enemies = useEnemyStore.getState()
    if (enemies.golemDefeated && brainState.state !== 'hidden') brainState.state = 'defeated'

    switch (brainState.state) {
      case 'defeated':
        action = 'Knock'
        break

      case 'hidden':
        action = 'Idle'
        if (playerInPantano) {
          brainState.well = pickWell(wells, player.x, player.z, { minDistance: EMERGE_MIN_DISTANCE, minInnerRadius: MIN_WELL_RADIUS })
          p.set(brainState.well.x, brainState.well.bottomY, brainState.well.z)
          brainState.state = 'emerging'
        }
        break

      case 'emerging': {
        const well = brainState.well!
        p.y = Math.min(p.y + CLIMB_SPEED * delta, well.rimY)
        faceTowards(player.x - p.x, player.z - p.z, delta)
        if (p.y >= well.rimY) brainState.state = playerInPantano ? 'chasing' : 'idle'
        break
      }

      case 'idle':
        action = 'Idle'
        if (playerInPantano) brainState.state = 'chasing'
        break

      case 'chasing': {
        if (!playerInPantano) {
          brainState.state = 'idle'
          brainState.swingStart = null
          action = 'Idle'
          break
        }
        const now = state.clock.elapsedTime
        const distance = Math.hypot(player.x - p.x, player.z - p.z)
        if (brainState.swingStart === null && distance < ATTACK_RANGE) {
          brainState.swingStart = now
          brainState.swingHit = false
        }
        if (brainState.swingStart === null) {
          walkTowards(player.x, player.z, delta)
          break
        }

        // Un golpe empezado se termina completo; así la animación no se reinicia cuando el jugador roza el borde del rango.
        action = 'Attack'
        faceTowards(player.x - p.x, player.z - p.z, delta)
        const swingDuration = (actions.Attack?.getClip().duration ?? 2) / ATTACK_ANIMATION_SPEED
        const elapsed = now - brainState.swingStart
        if (!brainState.swingHit && elapsed >= swingDuration * ATTACK_HIT_MOMENT) {
          brainState.swingHit = true
          if (distance < ATTACK_HIT_RANGE) useAvatarStore.getState().takeDamage(ATTACK_DAMAGE)
        }
        if (elapsed >= swingDuration) {
          // Si el jugador sigue cerca, encadena otro golpe alineado con el bucle del clip; si no, vuelve a caminar.
          brainState.swingStart = distance < ATTACK_RANGE ? brainState.swingStart + swingDuration : null
          brainState.swingHit = false
          if (brainState.swingStart === null) action = 'Walking'
        }
        break
      }
    }

    rb.current.setNextKinematicTranslation(p)
    group.current.visible = brainState.state !== 'hidden'
    enemies.golem.position.copy(p)
    enemies.golem.active = brainState.state !== 'hidden' && brainState.state !== 'defeated'
    playAction(action)
  })

  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders="cuboid" includeInvisible position={[0, HIDDEN_Y, 0]} {...props}>
      <group ref={group} dispose={null} visible={false}>
        <group name="Golem">
          <skinnedMesh
            name="Body"
            geometry={(nodes.Body as THREE.SkinnedMesh).geometry}
            material={materials.GolemMaterial}
            skeleton={(nodes.Body as THREE.SkinnedMesh).skeleton}
          />
          <primitive object={nodes.mixamorigHips} />
        </group>
      </group>
    </RigidBody>
  )
}

useGLTF.preload('/models-3d/enemies/Golem.glb')
