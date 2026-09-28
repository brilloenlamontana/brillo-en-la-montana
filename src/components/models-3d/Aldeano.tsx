import { useGLTF, useAnimations, Html } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useUIStore } from '../../store/uiStore'
import { useAvatarStore } from '../../store/avatarStore'
import { useProgressStore } from '../../store/progressStore'

export function Aldeano(props: any) {
  const group = useRef<THREE.Group>(null)
  const { nodes, materials, animations } = useGLTF('/models-3d/avatars/Aldeano.glb')
  const { actions } = useAnimations(animations, group)
  
  const { isAldeanoModalOpen, setAldeanoModalOpen } = useUIStore();
  const { progress } = useProgressStore();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  useEffect(() => {
    // Si ya respondió, vuelve a Idle
    if (progress.aldeanoHelp !== 'pending') {
       setIsTalking(false);
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

  useFrame(() => {
    if (!group.current) return;
    const playerPos = useAvatarStore.getState().playerPosition;
    if (!playerPos) return;

    const aldeanoPos = new THREE.Vector3();
    group.current.getWorldPosition(aldeanoPos);
    
    // Ignorar altura para la distancia
    const dist = new THREE.Vector3(aldeanoPos.x, 0, aldeanoPos.z).distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
    
    if (dist < 4 && progress.aldeanoHelp === 'pending') {
      if (!showPrompt) setShowPrompt(true);
    } else {
      if (showPrompt) setShowPrompt(false);
    }
  });

  return (
    <RigidBody type='fixed' colliders={"cuboid"}>
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
        {showPrompt && !isAldeanoModalOpen && (
          <Html position={[0, 2.5, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '5px', pointerEvents: 'none', whiteSpace: 'nowrap', userSelect: 'none' }}>
              Presiona <b>E</b> o haz clic para hablar
            </div>
          </Html>
        )}
        <group name="Aldeano">
          <skinnedMesh
            name="Body"
            geometry={(nodes.Body as THREE.SkinnedMesh).geometry}
            material={materials.AldeanoMaterial}
            skeleton={(nodes.Body as THREE.SkinnedMesh).skeleton}
          />
          <primitive object={nodes.mixamorigHips} />
        </group>
      </group>
    </RigidBody>
  )
}

useGLTF.preload('/models-3d/avatars/Aldeano.glb')
