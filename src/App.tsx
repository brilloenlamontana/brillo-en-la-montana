import React from 'react';
import { Canvas } from '@react-three/fiber';
import WebGPURenderer from 'three/src/renderers/webgpu/WebGPURenderer.js';
import Scene from './components/Scene';
import './index.css';

const App: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        gl={async (props) => {
          // Extraemos props incompatibles con WebGPURenderer
          const { powerPreference, ...restProps } = props;
          const renderer = new WebGPURenderer({
            ...restProps,
            powerPreference: 'high-performance'
          } as any);
          await renderer.init();
          return renderer;
        }}
        camera={{ position: [0, 2, 6], fov: 50 }}
      >
        <color attach="background" args={['#050505']} />
        <Scene />
      </Canvas>
      
      {/* Premium Title Overlay */}
      <div style={{
        position: 'absolute',
        top: '2rem',
        left: '2rem',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '3rem', 
          fontWeight: 800, 
          letterSpacing: '-1px',
          background: 'linear-gradient(90deg, #ff8a00, #e52e71)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0px 4px 20px rgba(229, 46, 113, 0.4)'
        }}>
          Brillo en la Montaña
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '1.2rem', fontWeight: 300 }}>
          Vite + React + WebGPU
        </p>
      </div>
    </div>
  );
};

export default App;
