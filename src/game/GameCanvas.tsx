import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useProgressStore } from '@/store/progressStore';
import { handleDefeat, resumeSpawn } from './challenges/progression';
import { CHALLENGES } from './challenges/registry';
import { AdaptiveResolution } from './engine/rendering/AdaptiveResolution';
import { RenderGate } from './engine/rendering/RenderGate';
import { createRenderer } from './engine/rendering/renderer';
import { START_DPR } from './engine/rendering/resolution';
import { Player } from './player/Player';
import { Ambience } from './world/Ambience';
import { Mapa } from './world/mapa/Mapa';
import { classifyRegion } from './world/regions';
import { Warmup } from './world/Warmup';
import { ZoneTracker } from './world/ZoneTracker';

// The 3D world (WebGPU): the shared map, every challenge of the registry and the player, whose defeats cost a star.
// The player appears at the checkpoint of the saved progress (read once, when the world opens) and the warmup
// prepares that part of the map. Warmup goes last inside the Suspense so it starts once everything has loaded.
export function GameCanvas() {
  const [start] = useState(() => {
    const spawn = resumeSpawn(useProgressStore.getState().progress);
    return { spawn, region: classifyRegion(spawn.x, spawn.y, spawn.z, 'villa') };
  });

  return (
    <Canvas camera={{ position: [start.spawn.x, start.spawn.y + 1.5, start.spawn.z + 2], far: 450 }} dpr={START_DPR} gl={createRenderer}>
      <RenderGate />
      <AdaptiveResolution />
      <Ambience />
      <ZoneTracker />
      <Suspense fallback={null}>
        <Physics>
          <Mapa />
          {CHALLENGES.map(({ id, World }) => (
            <World key={id} />
          ))}
          <Player start={start.spawn} onRespawn={handleDefeat} />
        </Physics>
        <Warmup startRegion={start.region} />
      </Suspense>
    </Canvas>
  );
}
