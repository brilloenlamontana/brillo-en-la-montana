import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

const Scene: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animación del cubo en cada frame
  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      {/* Luces cálidas y dinámicas */}
      <directionalLight position={[10, 10, 5]} intensity={2.5} color="#ff8a00" castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={1.5} color="#e52e71" />
      <pointLight position={[0, -5, 0]} intensity={1} color="#4361ee" />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef} castShadow receiveShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshPhysicalMaterial 
            color="#ffffff" 
            metalness={0.9}
            roughness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </mesh>
      </Float>

      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <Environment preset="city" />
    </>
  );
};

export default Scene;
