import { useThree } from '@react-three/fiber';
import { PerformanceMonitor, type PerformanceMonitorApi } from '@react-three/drei';
import { dprForFactor, START_DPR, START_FACTOR } from './resolution';
import { useWorldStore } from './worldStore';

// Frame-rate margin where nothing changes: under the lower bound quality goes down, over the upper one it goes up. On
// a 60 Hz screen the frame rate never exceeds 60, so the upper bound sits just under it (with drei's default, 60, it
// would never be reached and the resolution could only drop).
const bounds = (refreshRate: number): [number, number] => (refreshRate > 90 ? [50, 90] : [45, Math.max(50, refreshRate - 4)]);

// Moves the render resolution with the frame rate through PerformanceMonitor's factor (mapped in resolution.ts): it
// starts at the native resolution, rises step by step while there is headroom and falls when frames are missed. It
// only measures once the world finished loading: the loading and warmup frames are slow by nature and would push it
// to the minimum. If it keeps bouncing up and down it settles on the native resolution and stops measuring.
// R3F's setDpr never re-renders React.
export function AdaptiveResolution() {
  const ready = useWorldStore((state) => state.ready);
  const setDpr = useThree((state) => state.setDpr);
  if (!ready) return null;

  return (
    <PerformanceMonitor
      factor={START_FACTOR}
      step={0.1}
      bounds={bounds}
      flipflops={6}
      onChange={({ factor }: PerformanceMonitorApi) => setDpr(dprForFactor(factor))}
      onFallback={() => setDpr(START_DPR)}
    />
  );
}
