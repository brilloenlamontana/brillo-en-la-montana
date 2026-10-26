import { useFrame } from '@react-three/fiber';
import { useWorldStore } from './worldStore';

// Takes over R3F's render (a useFrame with priority does): while the world warms up behind the loading screen nothing
// is drawn, so the renderer never creates shader pipelines synchronously in the middle of a frame; Warmup compiles
// them asynchronously and in parallel instead (see Warmup). Afterwards it draws every frame, like R3F would.
export function RenderGate() {
  useFrame(({ gl, scene, camera }) => {
    if (!useWorldStore.getState().warming) gl.render(scene, camera);
  }, 1);
  return null;
}
