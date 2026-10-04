import { useGLTF, useAnimations } from '@react-three/drei'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAvatarStore } from '../../../../store/avatarStore'

export function Golem(props: any) {
  const group = useRef<THREE.Group>(null)
  const rb = useRef<RapierRigidBody>(null)
  const { nodes, materials, animations } = useGLTF('/models-3d/enemies/Golem.glb')
  const { actions } = useAnimations(animations, group)

  const [health] = useState(100)
  const lastAttackTime = useRef(0)
  const actionRef = useRef('Idle')

  useEffect(() => {
    // Inicia con la animación por defecto
    actions['Idle']?.reset().fadeIn(0.2).play()
    return () => {
      actions['Idle']?.fadeOut(0.2)
    };
  }, [actions]);

  useFrame((_state, delta) => {
    if (!rb.current || !group.current) return;

    const playerPos = useAvatarStore.getState().playerPosition;
    if (!playerPos) return;

    let nextAction = actionRef.current;

    const golemPos = rb.current.translation();
    const currentPos = new THREE.Vector3(golemPos.x, golemPos.y, golemPos.z);
    const targetPos = new THREE.Vector3(playerPos.x, currentPos.y, playerPos.z);

    // Distancia ignorando el eje Y
    const dist = currentPos.distanceTo(targetPos);

    // Dummy object para calcular la rotación suave
    const dummy = new THREE.Object3D();
    dummy.position.copy(currentPos);
    dummy.lookAt(targetPos);

    if (health <= 0) {
      nextAction = 'Knock';
      rb.current.setLinvel({ x: 0, y: rb.current.linvel().y, z: 0 }, true);
    } else if (dist < 2.5) {
      nextAction = 'Attack';
      rb.current.setLinvel({ x: 0, y: rb.current.linvel().y, z: 0 }, true);

      // Mirar al jugador suavemente
      group.current.quaternion.slerp(dummy.quaternion, 10 * delta);

      // Atacar con cooldown
      const now = Date.now();
      if (now - lastAttackTime.current > 1500) { // 1.5 segundos entre ataques
        useAvatarStore.getState().takeDamage(10);
        lastAttackTime.current = now;
      }
    } else if (dist < 20) { // Radio de detección (entrar al lago)
      nextAction = 'Walking'; // O 'Running'

      // Mover hacia el jugador
      const direction = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();
      const speed = 2.5; // Velocidad del golem
      rb.current.setLinvel({ x: direction.x * speed, y: rb.current.linvel().y, z: direction.z * speed }, true);

      // Mirar al jugador suavemente
      group.current.quaternion.slerp(dummy.quaternion, 10 * delta);
    } else {
      nextAction = 'Idle';
      rb.current.setLinvel({ x: 0, y: rb.current.linvel().y, z: 0 }, true);
    }

    // Cambiar la animación si es necesario sin usar useState (para evitar re-renders y parpadeos)
    if (actionRef.current !== nextAction) {
      const prevActionClip = actions[actionRef.current];
      const nextActionClip = actions[nextAction];

      prevActionClip?.fadeOut(0.2);
      nextActionClip?.reset().fadeIn(0.2).play();

      actionRef.current = nextAction;
    }
  });

  return (
    <RigidBody ref={rb} lockRotations colliders="hull" {...props}>
      <group ref={group} dispose={null}>
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
