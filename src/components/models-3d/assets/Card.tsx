import { Float, useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { useUIStore } from '../../../store/uiStore'
import { saveProgressToDB } from '../../../services/progressService'
import { useRef } from 'react'

export function Card(props: any) {
    const cardRef = useRef(null)
    const { scene } = useGLTF('/models-3d/assets-3d/Card.glb')
    const setAnnouncementOpen = useUIStore(state => state.setAnnouncementOpen)

    const handleOpen = () => {
        setAnnouncementOpen(true)
        saveProgressToDB(undefined, 'openedMayorLetter', true)
    }

    return (
        <Float
            speed={2} // Animation speed, defaults to 1
            rotationIntensity={0.1} // XYZ rotation intensity, defaults to 1
            floatIntensity={2} // Up/down float intensity, works like a multiplier with floatingRange,defaults to 1
            floatingRange={[-0.1, 0.1]} // Range of y-axis values the object will float within, defaults to [-0.1,0.1]
        >

            <RigidBody type='fixed'>
                <group
                    ref={cardRef}
                    {...props}
                    position={[0, 15, 3]}
                    dispose={null}
                    onClick={(e) => {
                        e.stopPropagation()
                        handleOpen()
                    }}
                    onPointerOver={() => document.body.style.cursor = 'pointer'}
                    onPointerOut={() => document.body.style.cursor = 'auto'}
                >
                    <primitive object={scene} />
                </group>
            </RigidBody>
        </Float>
    )
}

useGLTF.preload('/models-3d/assets-3d/Card.glb')
