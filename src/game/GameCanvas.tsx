import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useProgressStore } from '@/store/progressStore';
import { ObjectiveBeacon } from './challenges/ObjectiveBeacon';
import { handleDefeat, resumeSpawn } from './challenges/progression';
import { CHALLENGES } from './challenges/registry';
import { AdaptiveResolution } from './engine/rendering/AdaptiveResolution';
import { RenderGate } from './engine/rendering/RenderGate';
import { createRenderer, DEV_STATS } from './engine/rendering/renderer';
import { renderQuality } from './engine/rendering/resolution';
import { Player } from './player/Player';
import { usePlayerStore } from './player/playerStore';
import { GlowMaterials } from './engine/rendering/GlowPass';
import { Ambience } from './world/Ambience';
import { MundoRecuperado } from './world/MundoRecuperado';
import { Mapa } from './world/mapa/Mapa';
import { classifyRegion } from './world/regions';
import { Warmup } from './world/Warmup';
import { ZoneTracker } from './world/ZoneTracker';

// Development only: the performance meter (frames per second, processor and graphics card time, draw calls). Vite
// drops this branch, and with it the meter's code, from the published game. `?perf=0` hides it.
const DevStats = import.meta.env.DEV ? lazy(() => import('./engine/rendering/DevStats').then((m) => ({ default: m.DevStats }))) : null;

// Tells when what is mounted before it, inside the same <Suspense>, has loaded: its effect only runs then.
function Loaded({ onLoaded }: { onLoaded: () => void }) {
  useEffect(onLoaded, [onLoaded]);
  return null;
}

// The 3D world (WebGPU, or WebGL 2 where there is none): the shared map, every challenge of the story and the player,
// whose defeats cost a star. Everything is mounted from the start and prepared behind the loading screen (or behind the
// introduction video, on a first visit): loading the challenges as the player reached them stopped the game for
// seconds at every new place. Each challenge has its own Suspense, so a model that loads later (another avatar) never
// takes the world away; Warmup starts once all of them have loaded.
// The player appears at the checkpoint of the saved progress (read once, when the world opens).
export function GameCanvas() {
  const [start] = useState(() => {
    const spawn = usePlayerStore.getState().consumeInitialSpawn() ?? resumeSpawn(useProgressStore.getState().progress);
    return { spawn, region: classifyRegion(spawn.x, spawn.y, spawn.z, 'villa') };
  });
  const [loaded, setLoaded] = useState(0);
  const oneLoaded = useCallback(() => setLoaded((count) => count + 1), []);

  return (
    <Canvas camera={{ position: [start.spawn.x, start.spawn.y + 1.5, start.spawn.z + 2], far: 450 }} dpr={renderQuality().startDpr} gl={createRenderer}>
      <RenderGate />
      {DEV_STATS && DevStats && (
        <Suspense fallback={null}>
          <DevStats />
        </Suspense>
      )}
      <AdaptiveResolution />
      <Ambience />
      <MundoRecuperado />
      <GlowMaterials />
      <ObjectiveBeacon />
      <ZoneTracker />
      <Suspense fallback={null}>
        <Physics>
          <Mapa />
          {CHALLENGES.map(({ id, World }) => (
            <Suspense key={id} fallback={null}>
              <World />
              <Loaded onLoaded={oneLoaded} />
            </Suspense>
          ))}
          <Player start={start.spawn} onRespawn={handleDefeat} />
        </Physics>
        {loaded >= CHALLENGES.length && <Warmup startRegion={start.region} />}
      </Suspense>
    </Canvas>
  );
}
