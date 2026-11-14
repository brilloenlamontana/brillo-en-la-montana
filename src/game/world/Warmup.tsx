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

// Turns off frustum culling on everything shown that had it on, and returns those objects to turn it back on.
function neverCull(scene: Object3D): Object3D[] {
  const culled: Object3D[] = [];
  scene.traverseVisible((object) => {
    if (!object.frustumCulled) return;
    object.frustumCulled = false;
    culled.push(object);
  });
  return culled;
}

// Mounted last inside <Suspense>, so it runs once every model has loaded. Behind the loading screen (with RenderGate
// drawing nothing meanwhile) it visits every region of the map, one at a time, ending with the one where the player
// appears: each region's parts are mounted (its characters too, even the ones that hide until their moment),
// compileAsync prepares all their shader pipelines asynchronously and in parallel, instead of one by one in the middle
// of a frame, and one frame from above uploads their meshes and textures. Then a frame is drawn from the player's
// camera and the game opens. Loading takes a little longer, but walking into a new place or meeting its enemies no
// longer stops the game. One region at a time: the whole map is never drawn at once (on integrated GPUs that hung
// the device, DXGI_ERROR_DEVICE_HUNG). The timings go to the console as "[carga]".
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
        // Whatever waits out of sight (enemies under the ground until they come out, things far below or beside the
        // overhead view) is prepared too: nothing is skipped for being outside the camera while the region warms up.
        const culled = neverCull(scene);
        try {
          await gl.compileAsync?.(scene, overhead);
          // One frame from above uploads the region's meshes and textures, so arriving there later costs nothing.
          gl.render(scene, overhead);
        } catch (error) {
          console.warn(`Could not prepare the materials of ${region}:`, error);
        }
        culled.forEach((object) => (object.frustumCulled = true));
        await nextFrame();
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
