// Sky, fog and lights shared by the whole map. The fog ends at 200 m: models farther than that are never drawn.
export function Ambience() {
  return (
    <>
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#e2e8f0', 5, 200]} />
      <ambientLight intensity={0.9} color="#ffffff" />
      <directionalLight position={[100, 100, 50]} intensity={2} color="#dbeafe" />
    </>
  );
}
