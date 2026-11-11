import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { type Group, type Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { WebGPURenderer } from 'three/webgpu';
import { avatarModelUrl, genderFolder, type CharacterOption } from '@/data/characters';
import { useWebGPUSupport } from '@/game/engine/rendering/useWebGPUSupport';

const FOV = 28;

// Its own small WebGPU renderer, transparent over the card. It never reports to the world's error screen: if
// anything fails here the sprite is shown instead.
async function createPreviewRenderer({ canvas }: { canvas: unknown }) {
  const renderer = new WebGPURenderer({ canvas: canvas as HTMLCanvasElement, alpha: true, antialias: true });
  await renderer.init();
  return renderer;
}

// The character's model breathing in its Idle. A copy of the model: the world may be drawing the same one.
function IdleCharacter({ character }: { character: CharacterOption }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(avatarModelUrl(character.glbName));
  const { animations } = useGLTF(`/models-3d/animations/${genderFolder(character.gender)}/Idle.glb`);
  const model = useMemo(() => {
    const copy = clone(scene);
    copy.traverse((object) => {
      if ((object as Mesh).isMesh) object.frustumCulled = false;
    });
    return copy;
  }, [scene]);
  const clips = useMemo(() => animations.slice(0, 1).map((clip) => Object.assign(clip.clone(), { name: 'Idle' })), [animations]);
  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    actions.Idle?.reset().play();
  }, [actions]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={model} />
    </group>
  );
}

// Shows `fallback` instead of the 3D view if it fails (no WebGPU device, a file that does not load…).
class PreviewBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('The 3D character preview could not be shown:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// The player's character in 3D, in its Idle, framed whole whatever its height; it can be turned by dragging. Where
// WebGPU is missing (or while it is checked) the 2D sprite stands in.
export function CharacterPreview3D({ character }: { character: CharacterOption }) {
  const support = useWebGPUSupport();
  const fallback = <img src={character.imagePath} alt={character.name} className="h-full w-full object-contain drop-shadow-xl" />;
  if (support !== 'ok') return fallback;

  const h = character.height;
  // Distance at which the whole figure (plus a margin) fits the vertical field of view.
  const distance = (h * 1.2) / (2 * Math.tan(((FOV / 2) * Math.PI) / 180));
  return (
    <PreviewBoundary fallback={fallback}>
      <Canvas camera={{ fov: FOV, position: [0, h * 0.55, distance], near: 0.05, far: 50 }} dpr={[1, 2]} gl={createPreviewRenderer}>
        <ambientLight intensity={1.3} />
        <directionalLight position={[2, 4, 3]} intensity={2.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#fde2e4" />
        <Suspense fallback={null}>
          <IdleCharacter character={character} />
        </Suspense>
        <OrbitControls target={[0, h * 0.52, 0]} enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 2.6} maxPolarAngle={Math.PI / 1.9} />
      </Canvas>
    </PreviewBoundary>
  );
}
