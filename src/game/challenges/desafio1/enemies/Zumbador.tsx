import { playSfx } from '@/game/engine/audio/audio'
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
import { nearestWellRim, usePantanoWells } from '../pantanoTristeza/wells'
import { ZUMBADOR_COUNT } from '../mission'
import { pasoEnElPantano, puestoDelZumbador } from './guarida'

type ZumbadorState = 'hidden' | 'emerging' | 'chasing' | 'retreating' | 'hovering' | 'dying' | 'dead'

const HIDDEN_Y = -60
const ZUMBADOR_URL = DESAFIO1_MODELS.zumbador
// The model is tiny: the body is scaled up and the mesh scaled back by half (the collider follows the body).
const BODY_SCALE = 10
const MESH_SCALE = 0.5
const CHASE_SPEED = 4
const RETREAT_SPEED = 5
const CLIMB_SPEED = 3
const MIN_HEIGHT_ABOVE_GROUND = 0.5
// It stings on touching the avatar: this close to the point of the body it aims at (m).
const STING_RANGE = 0.45
// The last stretch is a dart: within DART_DISTANCE it flies this much faster, straight at the body.
const DART_DISTANCE = 3
const DART_BOOST = 1.8
// Where on the body each one aims (m over the feet): from the thighs to the chest, also on the short characters, so
// the swarm does not pile on one spot.
const AIM_HEIGHTS = [0.6, 0.85, 1.1, 1.3] as const
const STING_DAMAGE = 2 // 10 stings empty the 100 health points
const STING_COOLDOWN = 2
const DEATH_GRAVITY = 12
const DEATH_SPIN = 9
const DEATH_SECONDS = 1.8

// Same as the golem: it hovers around it in the middle of the swamp; while the player treads on the mud it goes after
// them, and when they step off it (or fall) it flies back to its place. It never leaves the swamp. `index` spreads the swarm across different wells (two per well)
// and offsets each one's wing flapping. The backpack insecticide kills them: they fall spinning and disappear forever
// (they are stored in the saved progress, so they do not come back on reload either).
export function Zumbador({ index, activo }: { index: number; activo: boolean }) {
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
    if (distance > 1e-3) {
      toTarget.multiplyScalar(Math.min(distance, speed * delta) / distance)
      // It never leaves the swamp: at the shore it slides along it.
      const [sx, sz] = pasoEnElPantano(p.x, p.z, toTarget.x, toTarget.z)
      p.x += sx
      p.y += toTarget.y
      p.z += sz
    }
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
    // After the player: only while they tread on the mud, alive (see MudTracker).
    const playerInPantano = usePantanoStore.getState().alerted
    const wobble = Math.sin(now * 15 + flapOffset) * 0.8
    const enemies = usePantanoStore.getState()
    // Far from the swamp it waits under the map: mounted and ready, doing nothing.
    if (!activo) {
      if (brainState.state !== 'hidden' && brainState.state !== 'dead') {
        brainState.state = 'hidden'
        p.set(0, HIDDEN_Y, 0)
        rb.current.setNextKinematicTranslation(p)
      }
      group.current.visible = useWorldStore.getState().warming
      const parked = enemies.zumbadores[index]
      if (parked) parked.active = false
      return
    }
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
        if (!defeated) {
          // Already out, hovering around the golem in the middle of the mud until the player treads on it.
          const puesto = puestoDelZumbador(index, ZUMBADOR_COUNT, wells)
          // No ground found under its place (the opening of a well): it comes out all the same, at the height of the
          // nearest rim. A zumbador that never comes out can never be defeated, and the swamp is never passed.
          const ground = terrainHeight(puesto.x, puesto.z, 60, 80) ?? nearestWellRim(puesto.x, puesto.z)?.y ?? null
          if (ground !== null) {
            brainState.hoverY = ground + puesto.height
            p.set(puesto.x, brainState.hoverY, puesto.z)
            brainState.state = 'hovering'
          }
        }
        break

      case 'emerging':
        p.y = Math.min(p.y + CLIMB_SPEED * delta, brainState.hoverY)
        if (p.y >= brainState.hoverY) brainState.state = playerInPantano ? 'chasing' : 'hovering'
        break

      case 'hovering': {
        if (playerInPantano) { brainState.state = 'chasing'; break }
        // The player is off the mud (or fell): it flies back to its place.
        const puesto = puestoDelZumbador(index, ZUMBADOR_COUNT, wells)
        if (Math.hypot(puesto.x - p.x, puesto.z - p.z) > 0.5) {
          const ground = terrainHeight(p.x, p.z, p.y + 5, 15)
          flyTowards(puesto.x, ground !== null ? ground + puesto.height : p.y, puesto.z, RETREAT_SPEED * speedFactor, delta, wobble)
        } else {
          p.y += Math.sin(now * 5 + flapOffset) * 0.3 * delta
        }
        keepAboveGround()
        break
      }

      case 'chasing': {
        if (!playerInPantano) { brainState.state = 'hovering'; break }
        // It flies at the avatar's body and stings on reaching it; near, it darts in without wobbling off its aim.
        const aimY = player.y + AIM_HEIGHTS[index % AIM_HEIGHTS.length]
        const near = Math.hypot(player.x - p.x, aimY - p.y, player.z - p.z) < DART_DISTANCE
        const distance = flyTowards(player.x, aimY, player.z, CHASE_SPEED * speedFactor * (near ? DART_BOOST : 1), delta, near ? 0 : wobble)
        if (distance < STING_RANGE) {
          if (now - brainState.lastSting > STING_COOLDOWN) {
            playSfx('d1_zumbon_picadura')
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
        {
          const back = RETREAT_SPEED * speedFactor * delta
          const [sx, sz] = pasoEnElPantano(p.x, p.z, retreatDir.current.x * back, retreatDir.current.z * back)
          p.x += sx
          p.y += retreatDir.current.y * back
          p.z += sz
        }
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
    // A sensor: it reaches the avatar's body to sting it without shoving the avatar around.
    <RigidBody ref={rb} type="kinematicPosition" colliders="cuboid" sensor includeInvisible position={[0, HIDDEN_Y, 0]} scale={BODY_SCALE}>
      <group ref={group} dispose={null} scale={MESH_SCALE} visible={false}>
        <mesh
          geometry={(nodes.Zumbador as THREE.Mesh).geometry}
          material={materials.ZumbadorMaterial}
        />
      </group>
    </RigidBody>
  )
}

