import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { warmupRegions, type Region } from './regions';
import { useZoneStore } from './zoneStore';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const seconds = (from: number) => ((performance.now() - from) / 1000).toFixed(1);

type AsyncCompiler = { compileAsync?: (scene: unknown, camera: unknown) => Promise<unknown> };

// Mounted last inside <Suspense>, so it runs once every model has loaded. Behind the loading screen it visits the
// region where the player appears and its neighbors: each draws what is visible from it (uploading meshes and
// textures) and compileAsync prepares its materials, so nothing stutters around the player. Only those regions, so
// the game opens sooner wherever the player resumes. The whole map is never drawn at once: on integrated GPUs that
// hung the device (DXGI_ERROR_DEVICE_HUNG). The timings go to the console as "[carga]".
export function Warmup({ startRegion }: { startRegion: Region }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    const compile = (gl as unknown as AsyncCompiler).compileAsync?.bind(gl);
    console.info(`[carga] modelos listos a los ${(performance.now() / 1000).toFixed(1)} s de abrir la página`);
    (async () => {
      const { setZone } = useZoneStore.getState();
      const started = performance.now();
      for (const region of warmupRegions(startRegion)) {
        if (cancelled) return;
        const regionStarted = performance.now();
        setZone(region, null);
        await nextFrame();
        await nextFrame();
        try {
          await compile?.(scene, camera);
        } catch (error) {
          console.warn(`Could not precompile the materials of ${region}:`, error);
        }
        console.info(`[carga] región ${region} preparada en ${seconds(regionStarted)} s`);
      }
      await nextFrame();
      if (cancelled) return;
      useWorldStore.getState().finishWarmup();
      console.info(`[carga] mundo listo: preparación ${seconds(started)} s, total ${(performance.now() / 1000).toFixed(1)} s`);
    })();
    return () => {
      cancelled = true;
      useWorldStore.getState().resetWorld();
    };
  }, [gl, scene, camera, startRegion]);

  return null;
}
