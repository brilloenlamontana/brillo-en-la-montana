import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, PerspectiveCamera, Vector3, type Camera, type Object3D } from 'three';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { warmupRegions, type Region } from './regions';
import { useZoneStore } from './zoneStore';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const seconds = (from: number) => ((performance.now() - from) / 1000).toFixed(1);

type Renderer = {
  compileAsync?: (scene: Object3D, camera: Camera) => Promise<unknown>;
  render: (scene: Object3D, camera: Camera) => void;
};

// compileAsync only prepares what is inside the camera's view. This camera hangs high over the map looking straight
// down with a wide view, so it sees every part mounted for the region (behind the player too): all of it is compiled.
function overheadCamera(scene: Object3D): PerspectiveCamera {
  const box = new Box3().setFromObject(scene);
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const halfFov = Math.PI / 3; // 120° field of view
  const height = (Math.hypot(size.x, size.z) / 2 / Math.tan(halfFov)) * 1.1;
  const camera = new PerspectiveCamera((halfFov * 2 * 180) / Math.PI, 1, 0.5, height + size.y + 50);
  camera.position.set(center.x, box.max.y + height, center.z);
  camera.rotation.set(-Math.PI / 2, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

// Mounted last inside <Suspense>, so it runs once every model has loaded. Behind the loading screen (with RenderGate
// drawing nothing meanwhile) it visits the region where the player appears and its neighbors: each region's parts are
// mounted and compileAsync prepares all their shader pipelines asynchronously and in parallel, instead of one by one
// in the middle of a frame. Then a single frame is drawn from the player's camera, which uploads the meshes and
// textures around them, and the game opens. Only those regions, so it opens sooner wherever the player resumes; the
// whole map is never drawn at once (on integrated GPUs that hung the device, DXGI_ERROR_DEVICE_HUNG). The timings go
// to the console as "[carga]".
export function Warmup({ startRegion }: { startRegion: Region }) {
  const gl = useThree((state) => state.gl) as unknown as Renderer;
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    console.info(`[carga] modelos listos a los ${(performance.now() / 1000).toFixed(1)} s de abrir la página`);
    (async () => {
      const { setZone } = useZoneStore.getState();
      const { reportPrepared } = useWorldStore.getState();
      const started = performance.now();
      const regions = warmupRegions(startRegion);
      const overhead = overheadCamera(scene);
      reportPrepared(0, regions.length + 1);
      for (const [done, region] of regions.entries()) {
        if (cancelled) return;
        const regionStarted = performance.now();
        setZone(region, null);
        // React mounts the region's parts and their useFrame callbacks run once (nothing is drawn).
        await nextFrame();
        await nextFrame();
        try {
          await gl.compileAsync?.(scene, overhead);
        } catch (error) {
          console.warn(`Could not precompile the materials of ${region}:`, error);
        }
        console.info(`[carga] región ${region} preparada en ${seconds(regionStarted)} s`);
        reportPrepared(done + 1, regions.length + 1);
      }
      if (cancelled) return;
      // The start region is the last one visited: one real frame uploads what the player sees first.
      const firstFrame = performance.now();
      await nextFrame();
      gl.render(scene, camera);
      await nextFrame();
      if (cancelled) return;
      console.info(`[carga] primer cuadro en ${seconds(firstFrame)} s`);
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
