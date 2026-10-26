import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { loseStar } from './challenges/progression';
import { CHALLENGES } from './challenges/registry';
import { AdaptiveResolution } from './engine/rendering/AdaptiveResolution';
import { createRenderer } from './engine/rendering/renderer';
import { START_DPR } from './engine/rendering/resolution';
import { Player } from './player/Player';
import { Ambience } from './world/Ambience';
import { Mapa } from './world/mapa/Mapa';
import { Warmup } from './world/Warmup';
import { ZoneTracker } from './world/ZoneTracker';

// The 3D world (WebGPU): the shared map, every challenge of the registry and the player, whose defeats cost a star.
// Warmup goes last inside the Suspense so it starts once everything has loaded.
export function GameCanvas() {
  return (
    <Canvas camera={{ position: [0, 1.5, 2], far: 450 }} dpr={START_DPR} gl={createRenderer}>
      <AdaptiveResolution />
      <Ambience />
      <ZoneTracker />
      <Suspense fallback={null}>
        <Physics>
          <Mapa />
          {CHALLENGES.map(({ id, World }) => (
            <World key={id} />
          ))}
          <Player onRespawn={loseStar} />
        </Physics>
        <Warmup />
      </Suspense>
    </Canvas>
  );
}
