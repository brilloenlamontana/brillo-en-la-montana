import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export function Pinares(props: any) {
    const { scene } = useGLTF('/models-3d/map/Pinares.glb');
    return (
        <RigidBody type="fixed" colliders="trimesh">
            <primitive object={scene} {...props} />
        </RigidBody>
    );
}

useGLTF.preload('/models-3d/map/Pinares.glb');
