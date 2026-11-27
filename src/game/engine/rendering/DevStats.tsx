import { useEffect, useRef } from 'react';
import { StatsGl } from '@react-three/drei';
import { addAfterEffect, useThree } from '@react-three/fiber';
// import { usePlayerStore } from '@/game/player/playerStore';
// import { useZoneStore } from '@/game/world/zoneStore';
import { knownBackend } from './backend';
import { useWorldStore } from './worldStore';

// Where the meter sits: left edge, under the health bar, clear of the HUD. It never takes clicks.
const PANEL = 'fixed left-2 top-20 z-40 flex gap-px opacity-90 pointer-events-none';
const READOUT = 'fixed left-2 top-[8.4rem] z-40 pointer-events-none rounded bg-black/70 px-2 py-1 font-mono text-[11px] leading-tight text-lime-300 whitespace-pre';
// The counts are read this often (s): they are for reading, not for watching flicker.
const EVERY = 0.5;
// A frame that takes this long (ms) is a stall worth reporting.
const STALL_MS = 120;

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

  // Every stall of the game is written to the console as "[tirón]", with how long it lasted and where the player was,
  // so a freeze can be reported by its place instead of by memory. Only once the world is open and the tab in view.
  useEffect(() => {
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const gap = now - last;
      last = now;
      const world = useWorldStore.getState();
      if (gap > STALL_MS && world.ready && !world.warming && !document.hidden) {
        // const { x, y, z } = usePlayerStore.getState().position;
        // const { region, interior } = useZoneStore.getState();
        // console.warn(`[tirón] ${Math.round(gap)} ms en ${interior ?? region} (x ${x.toFixed(0)}, y ${y.toFixed(0)}, z ${z.toFixed(0)}) a los ${(now / 1000).toFixed(1)} s`);
      }
      frame = requestAnimationFrame(tick);
    });
    // What the long frame was spent on, where the browser tells (Chrome): the scripts that ran in it, the longest
    // first, by function and file. It comes a moment after the "[tirón]" line of the same stall.
    type LongFrame = PerformanceEntry & { scripts?: { duration: number; invoker?: string; sourceFunctionName?: string; sourceURL?: string; forcedStyleAndLayoutDuration?: number }[] };
    let frames: PerformanceObserver | null = null;
    try {
      frames = new PerformanceObserver((list) => {
        const world = useWorldStore.getState();
        if (!world.ready || world.warming) return;
        for (const entry of list.getEntries() as LongFrame[]) {
          if (entry.duration < STALL_MS) continue;
          // const scripts = [...(entry.scripts ?? [])].sort((a, b) => b.duration - a.duration).slice(0, 4);
          // const told = scripts.map((script) => `${Math.round(script.duration)} ms ${script.sourceFunctionName || script.invoker || '?'} (${(script.sourceURL ?? '').split('/').slice(-2).join('/').split('?')[0]})`);
          // console.warn(`[tirón] ${Math.round(entry.duration)} ms a los ${((entry.startTime + entry.duration) / 1000).toFixed(1)} s, en: ${told.join(' · ') || 'nada de JavaScript (la tarjeta gráfica o el navegador)'}`);
        }
      });
      frames.observe({ type: 'long-animation-frame', buffered: false });
    } catch {
      // A browser without long animation frames: only the line with the place is written.
    }
    // Coming back to the tab is not a stall.
    const back = () => {
      last = performance.now();
    };
    document.addEventListener('visibilitychange', back);
    return () => {
      cancelAnimationFrame(frame);
      frames?.disconnect();
      document.removeEventListener('visibilitychange', back);
    };
  }, []);

  return <StatsGl className={PANEL} trackGPU />;
}
