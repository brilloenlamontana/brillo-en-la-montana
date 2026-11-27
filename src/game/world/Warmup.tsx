import { useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, PerspectiveCamera, Vector3, type Camera, type Object3D } from 'three';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { prepareHiddenParts } from './hiddenParts';
import { warmupRegions, type Interior, type Region } from './regions';
import { useZoneStore } from './zoneStore';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Nothing has been downloading for this long (ms): every model is in.
const QUIET_MS = 500;
// const seconds = (from: number) => ((performance.now() - from) / 1000).toFixed(1);

type Renderer = {
  compileAsync?: (scene: Object3D, camera: Camera, target?: Object3D) => Promise<unknown>;
  render: (scene: Object3D, camera: Camera) => void;
};

// The inside of each house is a place of its own (see visibility.ts): it is visited too, from the region it stands in.
const HOUSES: readonly (readonly [Region, Interior])[] = [
  ['casa', 'imeri'],
  ['valle', 'elfo'],
  ['pueblo', 'hedrig'],
  ['cumbre', 'santuario'],
];

// The renderer keeps what it prepared for an object per camera: prepared for another camera, every object would be
// prepared again the first time the game's camera saw it (that was the stall at every new place). So the game's own
// camera does the looking: for the instant in which the renderer lists or draws, it is put where `view` is (high over
// the map, looking down) and then put back.
function seenFrom<T>(camera: Camera, view: PerspectiveCamera, look: () => T): T {
  const own = camera as PerspectiveCamera;
  const before = { position: own.position.clone(), quaternion: own.quaternion.clone(), fov: own.fov, aspect: own.aspect, near: own.near, far: own.far };
  own.position.copy(view.position);
  own.quaternion.copy(view.quaternion);
  Object.assign(own, { fov: view.fov, aspect: view.aspect, near: view.near, far: view.far });
  own.updateMatrixWorld();
  own.updateProjectionMatrix();
  try {
    return look();
  } finally {
    own.position.copy(before.position);
    own.quaternion.copy(before.quaternion);
    Object.assign(own, { fov: before.fov, aspect: before.aspect, near: before.near, far: before.far });
    own.updateMatrixWorld();
    own.updateProjectionMatrix();
  }
}

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

// Mounted once the map and every challenge have loaded (GameCanvas). Behind the loading screen, or behind the
// introduction video on a first visit (with RenderGate drawing nothing meanwhile), it visits every region of the map,
// one at a time, ending with the one where the player appears: each region's parts are shown (its characters too, even
// the ones that hide until their moment), compileAsync prepares all their shader pipelines asynchronously, instead of
// one by one in the middle of a frame, and one frame from above uploads their meshes and textures. Then whatever is
// still hidden is prepared too (hiddenParts), a frame is drawn from the player's camera and the game opens. Loading
// takes longer, but nothing is left to prepare while playing: walking into a new place or meeting its enemies no
// longer stops the game. One region at a time: the whole map is never drawn at once (on integrated GPUs that hung the
// device, DXGI_ERROR_DEVICE_HUNG). The timings go to the console as "[carga]".
export function Warmup({ startRegion }: { startRegion: Region }) {
  const gl = useThree((state) => state.gl) as unknown as Renderer;
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    // console.info(`[carga] modelos listos a los ${(performance.now() / 1000).toFixed(1)} s de abrir la página`);
    (async () => {
      const { setZone } = useZoneStore.getState();
      const { reportPrepared } = useWorldStore.getState();
      // A model still on its way would be missed by the visit to its region.
      for (let quiet = 0; quiet < QUIET_MS && !cancelled; ) {
        await wait(100);
        quiet = useProgress.getState().active ? 0 : quiet + 100;
      }
      if (cancelled) return;
      // const started = performance.now();
      const regions = warmupRegions(startRegion);
      // Every region and, right after its region, the inside of the house that stands in it.
      const places = regions.flatMap((region): (readonly [Region, Interior | null])[] => [...HOUSES.filter(([at]) => at === region), [region, null]]);
      const overhead = overheadCamera(scene);
      reportPrepared(0, places.length + 2);
      for (const [done, [region, interior]] of places.entries()) {
        if (cancelled) return;
        // const regionStarted = performance.now();
        setZone(region, interior);
        // React mounts the region's parts and their useFrame callbacks run once (nothing is drawn).
        await nextFrame();
        await nextFrame();
        // Whatever waits out of sight (enemies under the ground until they come out, things far below or beside the
        // overhead view) is prepared too: nothing is skipped for being outside the camera while the region warms up.
        const culled = neverCull(scene);
        try {
          // (The renderer lists what there is to prepare before it yields for the first time.)
          await seenFrom(camera, overhead, () => gl.compileAsync?.(scene, camera));
          // One frame from above uploads the region's meshes and textures, so arriving there later costs nothing.
          seenFrom(camera, overhead, () => gl.render(scene, camera));
        } catch (error) {
          console.warn(`Could not prepare the materials of ${region}:`, error);
        }
        culled.forEach((object) => (object.frustumCulled = true));
        await nextFrame();
        // console.info(`[carga] ${interior ? `interior ${interior}` : `región ${region}`} preparado en ${seconds(regionStarted)} s`);
        reportPrepared(done + 1, places.length + 2);
      }
      if (cancelled) return;
      // const hiddenStarted = performance.now();
      // const hidden =
      await prepareHiddenParts(gl, scene, camera, () => cancelled);
      if (cancelled) return;
      // console.info(`[carga] ${hidden} partes ocultas preparadas en ${seconds(hiddenStarted)} s`);
      reportPrepared(places.length + 1, places.length + 2);
      // The start region is the last one visited: one real frame uploads what the player sees first.
      // const firstFrame = performance.now();
      await nextFrame();
      gl.render(scene, camera);
      await nextFrame();
      if (cancelled) return;
      // console.info(`[carga] primer cuadro en ${seconds(firstFrame)} s`);
      useWorldStore.getState().finishWarmup();
      // console.info(`[carga] mundo listo: preparación ${seconds(started)} s, total ${(performance.now() / 1000).toFixed(1)} s`);
    })();
    return () => {
      cancelled = true;
      useWorldStore.getState().resetWorld();
    };
  }, [gl, scene, camera, startRegion]);

  return null;
}
