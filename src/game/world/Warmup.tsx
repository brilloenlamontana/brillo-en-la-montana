import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { REGIONS } from './regions';
import { useZoneStore } from './zoneStore';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

type AsyncCompiler = { compileAsync?: (scene: unknown, camera: unknown) => Promise<unknown> };

// Mounted last inside <Suspense>, so it runs once every model has loaded. Behind the loading screen it visits the
// regions one by one: each draws what is visible from it (uploading meshes and textures) and compileAsync prepares its
// materials, so nothing stutters the first time it appears. The whole map is never drawn at once: on integrated GPUs
// that hung the device (DXGI_ERROR_DEVICE_HUNG).
export function Warmup() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    const compile = (gl as unknown as AsyncCompiler).compileAsync?.bind(gl);
    (async () => {
      const { setZone } = useZoneStore.getState();
      for (const region of REGIONS) {
        if (cancelled) return;
        setZone(region, null);
        await nextFrame();
        await nextFrame();
        try {
          await compile?.(scene, camera);
        } catch (error) {
          console.warn(`Could not precompile the materials of ${region}:`, error);
        }
      }
      await nextFrame();
      if (!cancelled) useWorldStore.getState().finishWarmup();
    })();
    return () => {
      cancelled = true;
      useWorldStore.getState().resetWorld();
    };
  }, [gl, scene, camera]);

  return null;
}
