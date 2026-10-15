import { useCallback } from 'react'
import { Float, Html, useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { MAYOR_CARD_ZONE } from '../../../../constants/zones'
import { useInteractKey } from '../../../../hooks/useInteractKey'
import { usePlayerNear } from '../../../../hooks/usePlayerNear'
import { useUIStore } from '../../../../store/uiStore'
import { saveProgressToDB } from '../../../../services/progressService'
import { InteractionPrompt } from '../../../ui/InteractionPrompt'

// El original tiene ~20 mil triángulos para un pergamino de medio metro; el LOD1 (`npm run lods`) tiene 2 mil.
const CARD_URL = '/models-3d/objects/Card_LOD1.glb'

// Anuncio del alcalde frente al portón de Villa Boj: se lee acercándose (E o el botón en celular) o tocándolo;
// abre AnnouncementModal (en WorldPage).
export function Card(props: any) {
    const { scene } = useGLTF(CARD_URL)
    const isOpen = useUIStore((state) => state.isAnnouncementOpen)
    const setAnnouncementOpen = useUIStore((state) => state.setAnnouncementOpen)
    const playerNear = usePlayerNear(MAYOR_CARD_ZONE)

    const handleOpen = useCallback(() => {
        setAnnouncementOpen(true)
        saveProgressToDB(undefined, 'openedMayorLetter', true)
    }, [setAnnouncementOpen])

    useInteractKey(playerNear && !isOpen, handleOpen)

    return (
        <Float
            speed={2} // Animation speed, defaults to 1
            rotationIntensity={0.1} // XYZ rotation intensity, defaults to 1
            floatIntensity={2} // Up/down float intensity, works like a multiplier with floatingRange,defaults to 1
            floatingRange={[-0.1, 0.1]} // Range of y-axis values the object will float within, defaults to [-0.1,0.1]
        >
            <RigidBody type='fixed' colliders="cuboid">
                <group
                    {...props}
                    dispose={null}
                    onClick={(e) => {
                        e.stopPropagation()
                        handleOpen()
                    }}
                    onPointerOver={() => document.body.style.cursor = 'pointer'}
                    onPointerOut={() => document.body.style.cursor = 'auto'}
                >
                    <primitive object={scene} />
                    {playerNear && !isOpen && (
                        <Html position={[0, 1, 0]} center>
                            <InteractionPrompt action="leer el anuncio" onActivate={handleOpen} />
                        </Html>
                    )}
                </group>
            </RigidBody>
        </Float>
    )
}

useGLTF.preload(CARD_URL)
