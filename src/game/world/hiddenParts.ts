import type { Camera, Mesh, Object3D } from 'three';

type Renderer = { compileAsync?: (object: Object3D, camera: Camera, scene: Object3D) => Promise<unknown> };

const isDrawn = (object: Object3D) => (object as Mesh).isMesh === true || (object as { isPoints?: boolean }).isPoints === true || (object as { isLine?: boolean }).isLine === true;

// Visiting every region (Warmup) prepares what each region shows. What stays hidden whatever the region (a thing that
// only appears at its moment of the story: an item in a hand, a fallen enemy, an opened door) would still be prepared
// the first time it is seen, in the middle of a frame, and the game would stop for it. This prepares every part of the
// scene that is mounted but hidden: its shader pipelines, meshes and textures. A hidden part is shown only for the
// instant in which the renderer lists what it needs (never for a drawn frame). It runs behind the loading screen (or
// the introduction video), never while playing: listing a part takes a moment of its own.
// `camera`: the game's own (what the renderer prepares is kept per camera); where it looks does not matter, since
// nothing is culled while a part is listed.
export async function prepareHiddenParts(gl: Renderer, scene: Object3D, camera: Camera, isCancelled: () => boolean): Promise<number> {
  if (!gl.compileAsync) return 0;

  const parts: Object3D[] = [];
  scene.traverse((object) => {
    if (object.visible) return;
    // (traverseVisible skips a hidden root: the root itself is looked at apart from what it holds.)
    let drawn = isDrawn(object);
    for (const child of object.children) {
      child.traverseVisible((inner) => {
        drawn ||= isDrawn(inner);
      });
    }
    if (drawn) parts.push(object);
  });

  let count = 0;
  for (const part of parts) {
    if (isCancelled()) break;
    // Still hidden, and still in the scene.
    if (part.visible || !part.parent) continue;
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
      listed = gl.compileAsync(part, camera, scene);
    } catch (error) {
      console.warn('Could not prepare a hidden part of the world:', error);
    } finally {
      part.visible = false;
      culled.forEach((object) => (object.frustumCulled = true));
    }
    try {
      await listed;
      count += 1;
    } catch (error) {
      console.warn('Could not prepare a hidden part of the world:', error);
    }
  }
  return count;
}
