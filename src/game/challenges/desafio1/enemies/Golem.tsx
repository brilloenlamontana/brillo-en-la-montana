import { useGLTF, useAnimations } from '@react-three/drei'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgressStore } from '@/store/progressStore'
import { useWorldStore } from '@/game/engine/rendering/worldStore'
import { useTerrainHeight } from '@/game/engine/physics/useTerrainHeight'
import { playOnceAndHold } from '@/game/engine/models/animation'
import { usePlayerStore } from '@/game/player/playerStore'
import { DESAFIO1_MODELS } from '../assets'
import { usePantanoStore } from '../pantanoStore'
import { pickWell, usePantanoWells, type Well } from '../pantanoTristeza/wells'

type GolemState = 'hidden' | 'emerging' | 'chasing' | 'idle' | 'defeated'
type GolemAction = 'Walking' | 'Attack' | 'Knock' | "Idle"

const HIDDEN_Y = -60
const GOLEM_URL = DESAFIO1_MODELS.golem
const GOLEM_SCALE = 2
const WALK_SPEED = 2.5
const CLIMB_SPEED = 2.5
const ATTACK_RANGE = 2.5 // distance at which a punch starts
const ATTACK_HIT_RANGE = 3.2 // the punch lands if the player is still within this distance when the fist arrives
const ATTACK_DAMAGE = 5 // 20 punches empty the 100 health points
const ATTACK_ANIMATION_SPEED = 1.4 // the Attack clip lasts 2.88 s; this way each punch takes ~2 s
const ATTACK_HIT_MOMENT = 0.5 // fraction of the punch at which the fist reaches the player
const FADE_SECONDS = 0.3
const EMERGE_MIN_DISTANCE = 12
const MIN_WELL_RADIUS = 1.6 // the golem is ~2.9 m wide at scale 2
const UP = new THREE.Vector3(0, 1, 0)

// Hidden in a swamp well until the player enters: it climbs out of the well closest to the player and chases them.
// When the player leaves the swamp it stays still where it is (Idle) and resumes the chase if they come back.
// The backpack gem deactivates it: it falls with the Knock animation and stays down. If it was already deactivated in
// a previous session (saved progress), it never leaves its well again.
export function Golem() {
  const group = useRef<THREE.Group>(null)
  const rb = useRef<RapierRigidBody>(null)
  const { nodes, materials, animations } = useGLTF(GOLEM_URL)
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

  // Once unmounted (the player moved away from the swamp) it no longer counts for the backpack gem.
  useEffect(() => () => {
    usePantanoStore.getState().golem.active = false
  }, [])

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
    const player = usePlayerStore.getState().position
    const playerInPantano = usePantanoStore.getState().playerOnMud
    let action: GolemAction | null = 'Walking'
    const enemies = usePantanoStore.getState()
    const golemDefeated = useProgressStore.getState().progress.golemDefeated
    if (golemDefeated && brainState.state !== 'hidden') brainState.state = 'defeated'
    // If progress is reset (another player, mission restarted), it hides in its well again.
    if (!golemDefeated && brainState.state === 'defeated') {
      brainState.state = 'hidden'
      p.set(0, HIDDEN_Y, 0)
    }

    switch (brainState.state) {
      case 'defeated':
        action = 'Knock'
        break

      case 'hidden':
        action = 'Idle'
        if (playerInPantano && !golemDefeated) {
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

        // A started punch always finishes; this way the animation does not restart when the player grazes the range edge.
        action = 'Attack'
        faceTowards(player.x - p.x, player.z - p.z, delta)
        const swingDuration = (actions.Attack?.getClip().duration ?? 2) / ATTACK_ANIMATION_SPEED
        const elapsed = now - brainState.swingStart
        if (!brainState.swingHit && elapsed >= swingDuration * ATTACK_HIT_MOMENT) {
          brainState.swingHit = true
          if (distance < ATTACK_HIT_RANGE) usePlayerStore.getState().takeDamage(ATTACK_DAMAGE)
        }
        if (elapsed >= swingDuration) {
          // If the player is still close, chain another punch aligned with the clip loop; otherwise walk again.
          brainState.swingStart = distance < ATTACK_RANGE ? brainState.swingStart + swingDuration : null
          brainState.swingHit = false
          if (brainState.swingStart === null) action = 'Walking'
        }
        break
      }
    }

    rb.current.setNextKinematicTranslation(p)
    // While loading it is drawn once even if hidden, to compile its material behind the loading screen.
    group.current.visible = brainState.state !== 'hidden' || useWorldStore.getState().warming
    enemies.golem.position.copy(p)
    enemies.golem.active = brainState.state !== 'hidden' && brainState.state !== 'defeated'
    playAction(action)
  })

  return (
    <RigidBody ref={rb} type="kinematicPosition" colliders="cuboid" includeInvisible position={[0, HIDDEN_Y, 0]} scale={GOLEM_SCALE}>
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

useGLTF.preload(GOLEM_URL)
