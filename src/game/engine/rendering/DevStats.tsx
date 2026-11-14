import { useEffect, useRef } from 'react';
import { StatsGl } from '@react-three/drei';
import { addAfterEffect, useThree } from '@react-three/fiber';
import { knownBackend } from './backend';

// Where the meter sits: left edge, under the health bar, clear of the HUD. It never takes clicks.
const PANEL = 'fixed left-2 top-20 z-40 flex gap-px opacity-90 pointer-events-none';
const READOUT = 'fixed left-2 top-[8.4rem] z-40 pointer-events-none rounded bg-black/70 px-2 py-1 font-mono text-[11px] leading-tight text-lime-300 whitespace-pre';
// The counts are read this often (s): they are for reading, not for watching flicker.
const EVERY = 0.5;

type RenderInfo = { render?: { drawCalls?: number; frameCalls?: number; calls?: number; triangles?: number }; memory?: { geometries?: number; textures?: number } };

// Development only (GameCanvas mounts it under import.meta.env.DEV; `?perf=0` hides it). A performance meter over the
// world: frames per second and the milliseconds the processor and the graphics card take per frame (stats-gl, which
// measures both WebGPU and WebGL 2; r3f-perf reads the WebGL context directly and does not work with the WebGPU
// renderer), and under it what is being drawn: which backend, draw calls, triangles, geometries and textures in memory,
// and the render resolution.
export function DevStats() {
  const gl = useThree((state) => state.gl);
  const readout = useRef<HTMLDivElement | null>(null);
  const since = useRef(0);

  useEffect(() => {
    const element = document.createElement('div');
    element.className = READOUT;
    document.body.appendChild(element);
    readout.current = element;
    return () => {
      element.remove();
      readout.current = null;
    };
  }, []);

  // Read right after each frame is drawn: the renderer clears its counts when the next one starts.
  useEffect(
    () =>
      addAfterEffect(() => {
        // The graphics card's time for the frame just drawn (the GPU panel reads it from the renderer's info).
        void (gl as unknown as { resolveTimestampsAsync?: (type: string) => Promise<unknown> }).resolveTimestampsAsync?.('render')?.catch(() => undefined);
        const now = performance.now() / 1000;
        if (now - since.current < EVERY || !readout.current) return;
        since.current = now;
        const { render, memory } = (gl as unknown as { info: RenderInfo }).info;
        const calls = render?.drawCalls || render?.frameCalls || render?.calls || 0;
        readout.current.textContent =
          `${knownBackend() ?? '…'} · dpr ${gl.getPixelRatio().toFixed(2)}\n` +
          `dibujos ${calls} · triángulos ${((render?.triangles ?? 0) / 1000).toFixed(0)}k\n` +
          `geometrías ${memory?.geometries ?? 0} · texturas ${memory?.textures ?? 0}`;
      }),
    [gl],
  );

  return <StatsGl className={PANEL} trackGPU />;
}
