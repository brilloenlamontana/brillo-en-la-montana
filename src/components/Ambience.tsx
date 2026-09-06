import { Sky } from "@react-three/drei"

export const Ambience: React.FC = () => {
    return (
        <>
            <fog attach="fog" args={['#e2e8f0', 5, 400]} />
            <ambientLight intensity={0.9} color="#ffffff" />
            <directionalLight position={[100, 100, 50]} intensity={1} color="#dbeafe" />
            <Sky
                turbidity={12}
                rayleigh={0.3}
                mieCoefficient={0.06}
                mieDirectionalG={0.8}
                sunPosition={[0, 0.5, -1]}
            />
        </>
    )
}