import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, type Camera, type Mesh, type Object3D } from 'three';
import { useWorldStore } from '@/game/engine/rendering/worldStore';

type Renderer = { compileAsync?: (object: Object3D, camera: Camera, scene: Object3D) => Promise<unknown> };

// Between two rounds, and how often the scene is looked over again for parts that arrived meanwhile (the challenges
// that load in the background: see GameCanvas).
const PAUSE_MS = 40;
const LOOK_AGAIN_MS = 2500;

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isDrawn = (object: Object3D) => (object as Mesh).isMesh === true || (object as { isPoints?: boolean }).isPoints === true || (object as { isLine?: boolean }).isLine === true;

// The loading screen only prepares the part of the map where the player appears and the ones beside it (Warmup).
// Everything else used to be prepared the first time it was seen, in the middle of a frame: walking for the first time
// into Imeri's clearing, the swamp, the valley or the forest froze the game for seconds while their shaders were
// built. This prepares the rest of the world quietly while the player plays: every part that is mounted but hidden
// (another region's, a closed house's, an enemy waiting under the ground) has its shader pipelines, meshes and
// textures made ready, one part at a time. A hidden part is shown only for the instant in which the renderer lists
// what it has to prepare (never for a drawn frame), and the renderer then works through that list a little per frame.
export function BackgroundWarmup() {
  const gl = useThree((state) => state.gl) as unknown as Renderer;
  const scene = useThree((state) => state.scene);
  const ready = useWorldStore((state) => state.ready);

  useEffect(() => {
    if (!ready || !gl.compileAsync) return;
    let cancelled = false;
    const done = new WeakSet<Object3D>();
    // Any camera does: nothing is culled while a part is listed. Its own camera, so the lists of the game's camera
    // are never touched.
    const camera = new PerspectiveCamera(60, 1, 0.5, 2000);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    // The hidden parts not prepared yet that hold something to draw.
    const pending = () => {
      const found: Object3D[] = [];
      scene.traverse((object) => {
        if (object.visible || done.has(object)) return;
        // (traverseVisible skips a hidden root: the root itself is looked at apart from what it holds.)
        let drawn = isDrawn(object);
        for (const child of object.children) {
          child.traverseVisible((inner) => {
            drawn ||= isDrawn(inner);
          });
        }
        if (drawn) found.push(object);
        else done.add(object);
      });
      return found;
    };

    const prepare = async (part: Object3D) => {
      done.add(part);
      // Still hidden, and still in the scene: shown for this instant only.
      if (part.visible || !part.parent) return;
      const culled: Object3D[] = [];
      part.visible = true;
      part.traverseVisible((object) => {
        if (!object.frustumCulled) return;
        object.frustumCulled = false;
        culled.push(object);
      });
      let listed: Promise<unknown> | undefined;
      try {
        // The renderer lists what the part needs before it yields for the first time.
        listed = gl.compileAsync?.(part, camera, scene);
      } finally {
        part.visible = false;
        culled.forEach((object) => (object.frustumCulled = true));
      }
      await listed;
    };

    void (async () => {
      const started = performance.now();
      let count = 0;
      while (!cancelled) {
        const parts = pending();
        if (!parts.length) {
          if (count) {
            console.info(`[carga] ${count} partes ocultas del mundo preparadas en segundo plano en ${((performance.now() - started) / 1000).toFixed(1)} s`);
            count = 0;
          }
          await wait(LOOK_AGAIN_MS);
          continue;
        }
        for (const part of parts) {
          if (cancelled) return;
          // Not while the loading screen warms a region up itself.
          if (useWorldStore.getState().warming) break;
          try {
            await prepare(part);
            count += 1;
          } catch (error) {
            console.warn('Could not prepare a hidden part of the world:', error);
          }
          await nextFrame();
          await wait(PAUSE_MS);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gl, scene, ready]);

  return null;
}
