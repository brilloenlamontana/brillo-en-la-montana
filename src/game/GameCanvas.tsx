import { lazy, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useProgressStore } from '@/store/progressStore';
import { handleDefeat, resumeSpawn } from './challenges/progression';
import { CHALLENGES } from './challenges/registry';
import type { Challenge } from './challenges/types';
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
import { classifyRegion, loadedRegions, type Region } from './world/regions';
import { Warmup } from './world/Warmup';
import { ZoneTracker } from './world/ZoneTracker';
import { useZoneStore } from './world/zoneStore';
import { useWorldStore } from './engine/rendering/worldStore';

// Development only: the performance meter (frames per second, processor and graphics card time, draw calls). Vite
// drops this branch, and with it the meter's code, from the published game. `?perf=0` hides it.
const DevStats = import.meta.env.DEV ? lazy(() => import('./engine/rendering/DevStats').then((m) => ({ default: m.DevStats }))) : null;

// Pause between two challenges loaded in the background: the frame rate stays smooth while the next one downloads.
const BACKGROUND_STEP_MS = 400;

// The challenges whose parts are needed for a player in `region`: those that take place in it or in a bordering region.
// Nothing of a challenge the player is far from is mounted, so its models are never downloaded.
function challengesNear(region: Region): Set<string> {
  const near = new Set<Region>(loadedRegions(region));
  return new Set(CHALLENGES.filter((challenge: Challenge) => challenge.regions.some((r) => near.has(r))).map((challenge) => challenge.id));
}

// The 3D world (WebGPU, or WebGL 2 where there is none): the shared map, the challenges the player is near and the player,
// whose defeats cost a star. A challenge stays mounted once it is near, so going back to it costs nothing. Each one has its
// own Suspense: while its models download, the rest of the world already shows.
// The player appears at the checkpoint of the saved progress (read once, when the world opens) and the warmup
// prepares the regions around that point. Warmup goes last inside the Suspense so it starts once the map has loaded.
export function GameCanvas() {
  const [start] = useState(() => {
    const spawn = usePlayerStore.getState().consumeInitialSpawn() ?? resumeSpawn(useProgressStore.getState().progress);
    return { spawn, region: classifyRegion(spawn.x, spawn.y, spawn.z, 'villa') };
  });
  const [mounted, setMounted] = useState<ReadonlySet<string>>(() => challengesNear(start.region));
  const ready = useWorldStore((state) => state.ready);

  // Walking into a new part of the map mounts the challenges around it (the set only grows).
  useEffect(
    () =>
      useZoneStore.subscribe((state, previous) => {
        if (state.region === previous.region) return;
        const near = challengesNear(state.region);
        setMounted((current) => (Array.from(near).every((id) => current.has(id)) ? current : new Set([...current, ...near])));
      }),
    [],
  );

  // Once the world is open, the rest of the story loads quietly in the background, one challenge at a time, in story
  // order. Nothing is shown for it: a challenge that is not in its region stays hidden (see visibility.ts), and by the
  // time the player walks there its models are already in place.
  useEffect(() => {
    if (!ready) return;
    const next = CHALLENGES.find((challenge) => !mounted.has(challenge.id));
    if (!next) return;
    const timer = setTimeout(() => {
      console.info(`[carga] desafío "${next.title}" cargado en segundo plano a los ${(performance.now() / 1000).toFixed(1)} s`);
      setMounted((current) => new Set([...current, next.id]));
    }, BACKGROUND_STEP_MS);
    return () => clearTimeout(timer);
  }, [ready, mounted]);

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
      <ZoneTracker />
      <Suspense fallback={null}>
        <Physics>
          <Mapa />
          {CHALLENGES.map(({ id, World }) =>
            mounted.has(id) ? (
              <Suspense key={id} fallback={null}>
                <World />
              </Suspense>
            ) : null,
          )}
          <Player start={start.spawn} onRespawn={handleDefeat} />
        </Physics>
        <Warmup startRegion={start.region} />
      </Suspense>
    </Canvas>
  );
}
