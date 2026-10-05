import { useGLTF, useAnimations, Html } from '@react-three/drei'
import { RigidBody, CylinderCollider, CapsuleCollider } from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useUIStore } from '../../../../store/uiStore'
import { useProgressStore } from '../../../../store/progressStore'
import { AldeanoModal } from './AldeanoModal'

export function Aldeano(props: any) {
  const group = useRef<THREE.Group>(null)
  const { nodes, materials, animations } = useGLTF('/models-3d/npcs/Aldeano.glb')
  const { actions } = useAnimations(animations, group)

  const { isAldeanoModalOpen, setAldeanoModalOpen } = useUIStore();
  const { progress } = useProgressStore();

  const [showPrompt, setShowPrompt] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Usamos una referencia para contar cuántos colliders del jugador entran/salen
  // y evitar que el texto parpadee causando re-renders.
  const intersectingCount = useRef(0);

  useEffect(() => {
    // Si ya respondió, vuelve a Idle
    if (progress.aldeanoHelp !== 'pending') {
      setIsTalking(false);
      setShowPrompt(false);
    }
  }, [progress.aldeanoHelp]);

  useEffect(() => {
    // Cleanup y cambio de animaciones
    const actionName = isTalking ? 'Talking' : 'Idle';
    // Algunos GLTF pueden tener "Talking", otros "Hablar". Asumimos 'Talking' como solicitó el usuario, o un fallback a Idle
    const currentAction = actions[actionName] || actions['Idle'];
    currentAction?.reset().fadeIn(0.2).play()
    return () => { currentAction?.fadeOut(0.2) };
  }, [actions, isTalking]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && showPrompt && progress.aldeanoHelp === 'pending') {
        setIsTalking(true);
        setAldeanoModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrompt, setAldeanoModalOpen, progress.aldeanoHelp]);

  // El useFrame fue reemplazado por un CylinderCollider tipo sensor para mejor rendimiento

  return (
    <RigidBody type='fixed' colliders={"cuboid"}>
      {/* Collider físico manual para el cuerpo del aldeano (evita que el auto-collider evalúe el SkinnedMesh) */}
      <CapsuleCollider args={[1, 0.5]} position={[0, 1.5, 0]} />

      {/* Sensor de proximidad cilíndrico (radius 4, height 2) */}
      <CylinderCollider
        args={[2, 4]}
        position={[0, 1, 0]}
        sensor
        onIntersectionEnter={() => {
          // Aumentamos el contador cuando un collider del jugador entra
          intersectingCount.current += 1;
          if (intersectingCount.current > 0 && progress.aldeanoHelp === 'pending') {
            setShowPrompt(true);
          }
        }}
        onIntersectionExit={() => {
          // Reducimos el contador cuando un collider sale
          intersectingCount.current -= 1;
          if (intersectingCount.current <= 0) {
            intersectingCount.current = 0;
            setShowPrompt(false);
          }
        }}
      />
      <group
        ref={group}
        {...props}
        dispose={null}
        onClick={(e) => {
          e.stopPropagation();
          if (showPrompt && progress.aldeanoHelp === 'pending') {
            setIsTalking(true);
            setAldeanoModalOpen(true);
          }
        }}
        onPointerEnter={() => {
          if (showPrompt) document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'default';
        }}
      >
        {showPrompt && !isAldeanoModalOpen && progress.aldeanoHelp === 'pending' && (
          <Html position={[0, 2.5, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '5px', pointerEvents: 'none', whiteSpace: 'nowrap', userSelect: 'none' }}>
              Presiona <b>E</b> o haz clic para hablar
            </div>
          </Html>
        )}
        <Html fullscreen zIndexRange={[100, 0]}>
          <AldeanoModal />
        </Html>
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
