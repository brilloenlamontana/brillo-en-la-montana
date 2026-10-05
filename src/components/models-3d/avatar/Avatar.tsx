import { useGLTF, useAnimations } from '@react-three/drei'

import { useFrame } from '@react-three/fiber'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useAvatarStore } from '../../../store/avatarStore'
import { playOnceAndHold } from '../../../utils/animation'

export function Avatar(props: any) {
  const avatarRef = useRef<THREE.Group>(null)
  const lastLogTime = useRef(0)

  const { avatarName, action } = useAvatarStore();

  const genderFolder = 'woman'; // Solo hay animaciones de 'woman' en public/

  const { nodes, materials } = useGLTF(`/models-3d/avatars/${avatarName}.glb`) as any

  const { animations: idleAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Idle.glb`) as any
  const { animations: walkAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Walking.glb`) as any
  const { animations: runAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Running.glb`) as any
  const { animations: deathAnim } = useGLTF(`/models-3d/animations/${genderFolder}/Death.glb`) as any

  const allAnimations = useMemo(() => {
    const clips: THREE.AnimationClip[] = [];
    if (idleAnim?.length) {
      const clip = idleAnim[0].clone();
      clip.name = 'Idle';
      clips.push(clip);
    }
    if (walkAnim?.length) {
      const clip = walkAnim[0].clone();
      clip.name = 'Walking';
      clips.push(clip);
    }
    if (runAnim?.length) {
      const clip = runAnim[0].clone();
      clip.name = 'Running';
      clips.push(clip);
    }
    if (deathAnim?.length) {
      const clip = deathAnim[0].clone();
      clip.name = 'Death';
      clips.push(clip);
    }
    return clips;
  }, [idleAnim, walkAnim, runAnim, deathAnim]);

  const { actions } = useAnimations(allAnimations, avatarRef)

  useEffect(() => {
    if (actions.Death) playOnceAndHold(actions.Death);
  }, [actions]);

  useEffect(() => {
    const currentAction = actions[action];
    currentAction?.reset().fadeIn(0.2).play()
    return () => currentAction?.fadeOut(0.2) as any;
  }, [action, actions]);

  // Update player position every frame without causing re-renders
  useFrame((state) => {
    if (avatarRef.current) {
      const position = new THREE.Vector3();
      avatarRef.current.getWorldPosition(position);
      useAvatarStore.getState().playerPosition.copy(position);

      // Log position every second
      if (state.clock.elapsedTime - lastLogTime.current > 1) {
        // console.log('Posición del Avatar:', { x: position.x.toFixed(2), y: position.y.toFixed(2), z: position.z.toFixed(2) });
        lastLogTime.current = state.clock.elapsedTime;
      }
    }
  });

  return (
    <group ref={avatarRef} dispose={null} {...props}>
      <group rotation={[Math.PI / 2, 0 , 0]} scale={0.01}>
        <skinnedMesh
          geometry={nodes.Avatar.geometry}
          material={materials.AvatarMaterial}
          skeleton={nodes.Avatar.skeleton}
        />
        <primitive object={nodes.mixamorigHips} />
      </group>
    </group>
  )
}
