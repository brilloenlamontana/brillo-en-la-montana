import { useGLTF } from '@react-three/drei'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useProgressStore } from '@/store/progressStore'
import { useWorldStore } from '@/game/engine/rendering/worldStore'
import { useTerrainHeight } from '@/game/engine/physics/useTerrainHeight'
import { usePlayerStore } from '@/game/player/playerStore'
import { DESAFIO1_MODELS } from '../assets'
import { usePantanoStore } from '../pantanoStore'
import { pickWell, usePantanoWells } from '../pantanoTristeza/wells'

type ZumbadorState = 'hidden' | 'emerging' | 'chasing' | 'retreating' | 'hovering' | 'dying' | 'dead'

const HIDDEN_Y = -60
const ZUMBADOR_URL = DESAFIO1_MODELS.zumbador
// The model is tiny: the body is scaled up and the mesh scaled back by half (the collider follows the body).
const BODY_SCALE = 10
const MESH_SCALE = 0.5
const CHASE_SPEED = 4
const RETREAT_SPEED = 5
const CLIMB_SPEED = 3
const HOVER_ABOVE_RIM = 1.5
const MIN_HEIGHT_ABOVE_GROUND = 0.5
const STING_RANGE = 1.5
const STING_DAMAGE = 2 // 10 stings empty the 100 health points
const STING_COOLDOWN = 2
const EMERGE_MIN_DISTANCE = 6
const ZUMBADORES_PER_WELL = 2
const DEATH_GRAVITY = 12
const DEATH_SPIN = 9
const DEATH_SECONDS = 1.8

// Same as the golem: hidden in a well until the player enters the swamp; when they leave, it keeps hovering where
// it is and chases them again if they return. `index` spreads the swarm across different wells (two per well)
// and offsets each one's wing flapping. The backpack insecticide kills them: they fall spinning and disappear forever
// (they are stored in the saved progress, so they do not come back on reload either).
export function Zumbador({ index }: { index: number }) {
  const { nodes, materials } = useGLTF(ZUMBADOR_URL)
  const rb = useRef<RapierRigidBody>(null)
  const group = useRef<THREE.Group>(null)
  const wells = usePantanoWells()
  const terrainHeight = useTerrainHeight()

  const brain = useRef<{ state: ZumbadorState; lastSting: number; retreatUntil: number; hoverY: number; diedAt: number; fallSpeed: number }>({
    state: 'hidden', lastSting: -Infinity, retreatUntil: 0, hoverY: 0, diedAt: 0, fallSpeed: 0,
  })
  const position = useRef(new THREE.Vector3(0, HIDDEN_Y, 0))
  const retreatDir = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const lookHelper = useRef(new THREE.Object3D())

  // Once unmounted (the player moved away from the swamp) it no longer counts for the backpack insecticide.
  useEffect(() => () => {
    const tracker = usePantanoStore.getState().zumbadores[index]
    if (tracker) tracker.active = false
  }, [index])

  const flapOffset = index * 12.7
  const speedFactor = 0.8 + ((index * 7) % 10) / 20

  const flyTowards = (tx: number, ty: number, tz: number, speed: number, delta: number, wobble: number) => {
    const p = position.current
    target.current.set(tx, ty, tz)
    const toTarget = direction.current.subVectors(target.current, p)
    const distance = toTarget.length()
    if (distance > 1e-3) p.addScaledVector(toTarget.divideScalar(distance), Math.min(distance, speed * delta))
    p.y += wobble * delta
    lookAt(target.current, delta)
    return distance
  }

  const lookAt = (point: THREE.Vector3, delta: number) => {
    if (!group.current) return
    const helper = lookHelper.current
    helper.position.copy(position.current)
    helper.lookAt(point)
    group.current.quaternion.slerp(helper.quaternion, Math.min(1, 10 * delta))
  }

  const keepAboveGround = () => {
    const p = position.current
    const ground = terrainHeight(p.x, p.z, p.y + 5, 15)
    if (ground !== null && p.y < ground + MIN_HEIGHT_ABOVE_GROUND) p.y = ground + MIN_HEIGHT_ABOVE_GROUND
  }

  useFrame((state, rawDelta) => {
    if (!rb.current || !group.current) return
    const delta = Math.min(rawDelta, 0.1)
    const now = state.clock.elapsedTime
    const brainState = brain.current
    const p = position.current
    const player = usePlayerStore.getState().position
    const playerInPantano = usePantanoStore.getState().playerOnMud
    const wobble = Math.sin(now * 15 + flapOffset) * 0.8
    const enemies = usePantanoStore.getState()
    const defeated = useProgressStore.getState().progress.zumbadoresDefeated.includes(index)
    if (defeated && brainState.state === 'hidden') brainState.state = 'dead'
    // If progress is reset (another player, mission restarted), it hides in its well again.
    if (!defeated && brainState.state === 'dead') brainState.state = 'hidden'
    const alive = brainState.state !== 'dying' && brainState.state !== 'dead'
    if (alive && brainState.state !== 'hidden' && defeated) {
      brainState.state = 'dying'
      brainState.diedAt = now
      brainState.fallSpeed = 0
    }

    switch (brainState.state) {
      case 'dead':
        break

      case 'dying': {
        brainState.fallSpeed += DEATH_GRAVITY * delta
        p.y -= brainState.fallSpeed * delta
        group.current.rotation.z += DEATH_SPIN * delta
        const ground = terrainHeight(p.x, p.z, p.y + 5, 15)
        if ((ground !== null && p.y <= ground) || now - brainState.diedAt > DEATH_SECONDS) {
          p.set(p.x, HIDDEN_Y, p.z)
          brainState.state = 'dead'
        }
        break
      }

      case 'hidden':
        if (playerInPantano) {
          const well = pickWell(wells, player.x, player.z, { minDistance: EMERGE_MIN_DISTANCE, rank: Math.floor(index / ZUMBADORES_PER_WELL) })
          const side = index % ZUMBADORES_PER_WELL === 0 ? -1 : 1
          brainState.hoverY = well.rimY + HOVER_ABOVE_RIM + (index % 3) * 0.4
          p.set(well.x + side * well.innerRadius * 0.4, well.bottomY + 0.5, well.z)
          brainState.state = 'emerging'
        }
        break

      case 'emerging':
        p.y = Math.min(p.y + CLIMB_SPEED * delta, brainState.hoverY)
        if (p.y >= brainState.hoverY) brainState.state = playerInPantano ? 'chasing' : 'hovering'
        break

      case 'hovering':
        if (playerInPantano) { brainState.state = 'chasing'; break }
        p.y += Math.sin(now * 5 + flapOffset) * 0.3 * delta
        keepAboveGround()
        break

      case 'chasing': {
        if (!playerInPantano) { brainState.state = 'hovering'; break }
        const distance = flyTowards(player.x, player.y + 1.5, player.z, CHASE_SPEED * speedFactor, delta, wobble)
        if (distance < STING_RANGE) {
          if (now - brainState.lastSting > STING_COOLDOWN) {
            usePlayerStore.getState().takeDamage(STING_DAMAGE)
            brainState.lastSting = now
          }
          // After stinging it briefly backs off sideways and upwards.
          const angle = Math.random() * Math.PI * 2
          retreatDir.current.set(Math.cos(angle), 0.5 + Math.random(), Math.sin(angle)).normalize()
          brainState.retreatUntil = now + 1 + Math.random() * 1.5
          brainState.state = 'retreating'
        }
        keepAboveGround()
        break
      }

      case 'retreating':
        if (!playerInPantano) { brainState.state = 'hovering'; break }
        p.addScaledVector(retreatDir.current, RETREAT_SPEED * speedFactor * delta)
        p.y += Math.sin(now * 20 + flapOffset) * 0.5 * delta
        target.current.copy(p).add(retreatDir.current)
        lookAt(target.current, delta)
        keepAboveGround()
        if (now > brainState.retreatUntil) brainState.state = 'chasing'
        break
    }

    rb.current.setNextKinematicTranslation(p)
    group.current.visible = (brainState.state !== 'hidden' && brainState.state !== 'dead') || useWorldStore.getState().warming
    const tracker = enemies.zumbadores[index]
    if (tracker) {
      tracker.position.copy(p)
      tracker.active = ['emerging', 'chasing', 'retreating', 'hovering'].includes(brainState.state)
    }
  })

  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders="cuboid" includeInvisible position={[0, HIDDEN_Y, 0]} scale={BODY_SCALE}>
      <group ref={group} dispose={null} scale={MESH_SCALE} visible={false}>
        <mesh
          geometry={(nodes.Zumbador as THREE.Mesh).geometry}
          material={materials.ZumbadorMaterial}
        />
      </group>
    </RigidBody>
  )
}

useGLTF.preload(ZUMBADOR_URL)
