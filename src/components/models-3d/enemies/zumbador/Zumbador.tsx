import { useGLTF } from '@react-three/drei'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAvatarStore } from '../../../../store/avatarStore'

export function Zumbador(props: any) {
    const { nodes, materials } = useGLTF('/models-3d/enemies/Zumbador.glb')
    const rb = useRef<RapierRigidBody>(null)
    const group = useRef<THREE.Group>(null)
    const lastAttackTime = useRef(0)
    const behaviorState = useRef<'chasing' | 'retreating'>('chasing')
    const retreatDir = useRef(new THREE.Vector3())
    const retreatEndTime = useRef(0)

    // Offset aleatorio para que los mosquitos no se muevan exactamente igual
    const randomOffset = useMemo(() => Math.random() * 100, []);
    const speedOffset = useMemo(() => 0.8 + Math.random() * 0.5, []);

    useFrame((state, delta) => {
        if (!rb.current || !group.current) return;

        const playerPos = useAvatarStore.getState().playerPosition;
        if (!playerPos) return;

        const mosquitoPos = rb.current.translation();
        const currentPos = new THREE.Vector3(mosquitoPos.x, mosquitoPos.y, mosquitoPos.z);

        // Objetivo: la cabeza/torso del avatar
        const targetPos = new THREE.Vector3(playerPos.x, playerPos.y + 1.5, playerPos.z);

        const dist = currentPos.distanceTo(targetPos);
        const now = Date.now();

        if (dist < 40) { // Radio de persecución
            if (behaviorState.current === 'retreating') {
                // Escapar temporalmente
                if (now > retreatEndTime.current) {
                    behaviorState.current = 'chasing';
                } else {
                    const flyY = Math.sin(state.clock.elapsedTime * 20 + randomOffset) * 0.5;
                    const speed = 5 * speedOffset;
                    rb.current.setLinvel({
                        x: retreatDir.current.x * speed,
                        y: retreatDir.current.y * speed + flyY,
                        z: retreatDir.current.z * speed
                    }, true);

                    // Mirar hacia donde huye
                    const lookPos = new THREE.Vector3().copy(currentPos).add(retreatDir.current);
                    const dummy = new THREE.Object3D();
                    dummy.position.copy(currentPos);
                    dummy.lookAt(lookPos);
                    group.current.quaternion.slerp(dummy.quaternion, 10 * delta);
                }
            } else {
                // Perseguir al jugador
                if (dist < 1.5) {
                    // Picar y empezar a huir
                    if (now - lastAttackTime.current > 2000) {
                        useAvatarStore.getState().takeDamage(2);
                        lastAttackTime.current = now;
                    }
                    behaviorState.current = 'retreating';
                    retreatEndTime.current = now + 1000 + Math.random() * 1500; // Huir durante 1 a 2.5 seg

                    // Escoger una dirección aleatoria para huir (a los lados y un poco hacia arriba)
                    const angle = Math.random() * Math.PI * 2;
                    retreatDir.current.set(Math.cos(angle), 0.5 + Math.random(), Math.sin(angle)).normalize();
                } else {
                    // Volar hacia el jugador
                    const direction = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();
                    const flyY = Math.sin(state.clock.elapsedTime * 15 + randomOffset) * 0.8;
                    const speed = 4 * speedOffset;
                    rb.current.setLinvel({
                        x: direction.x * speed,
                        y: direction.y * speed + flyY,
                        z: direction.z * speed
                    }, true);

                    // Mirar al jugador suavemente
                    const dummy = new THREE.Object3D();
                    dummy.position.copy(currentPos);
                    dummy.lookAt(targetPos);
                    group.current.quaternion.slerp(dummy.quaternion, 10 * delta);
                }
            }
        } else {
            // Si está lejos, solo flota tranquilamente
            const flyY = Math.sin(state.clock.elapsedTime * 5 + randomOffset) * 0.3;
            rb.current.setLinvel({ x: 0, y: flyY, z: 0 }, true);
        }
    });

    return (
        <RigidBody ref={rb} type="dynamic" gravityScale={0} lockRotations colliders="hull" {...props}>
            <group ref={group} dispose={null} scale={0.5}>
                <mesh
                    castShadow
                    receiveShadow
                    geometry={(nodes.Mosquito as THREE.Mesh).geometry}
                    material={materials.MosquitoMaterial}
                />
            </group>
        </RigidBody>
    )
}

useGLTF.preload('/models-3d/enemies/Zumbador.glb')
