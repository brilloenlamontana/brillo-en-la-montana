export const Ambience: React.FC = () => {
    return (
        <>
            <color attach="background" args={['#ffffff']} />
            <fog attach="fog" args={['#e2e8f0', 5, 400]} />
            <ambientLight intensity={0.9} color="#ffffff" />
            <directionalLight position={[100, 100, 50]} intensity={1} color="#dbeafe" />
        </>
    )
}