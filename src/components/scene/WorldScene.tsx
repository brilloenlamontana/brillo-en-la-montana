import React, { Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls, PerformanceMonitor } from '@react-three/drei';
import { PANTANO_EXIT_MARGIN, PANTANO_POLYGON } from '../../constants/zones';
import { useAvatarStore } from '../../store/avatarStore';
import { useWorldStore } from '../../store/worldStore';
import { useZoneStore } from '../../store/zoneStore';
import { distanceToPolygonEdge, isPointInPolygon } from '../../utils/polygon';
import { classifyRegion } from '../../utils/regions';
import { Ambience } from '../environment/Ambience';
import { Map } from '../models-3d/map/Map';
import { Npcs } from '../models-3d/npcs/Npcs';
import { Enemies } from '../models-3d/enemies/Enemies';
import { Objects } from '../models-3d/objects/Objects';
import { Avatar } from '../models-3d/avatar/Avatar';
import { PlayerController } from '../models-3d/avatar/PlayerController';
import { KEYBOARD_MAP } from '../../constants/keyboardMap';
import { createWebGPURenderer } from '../../utils/webgpuRenderer';

// Resolución de render: arranca en la del dispositivo (máximo 1.5x) y PerformanceMonitor la baja si no se sostienen
// los 60 cuadros por segundo, o la sube de nuevo si sobra margen.
const MAX_DPR = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio, 1.5);
const MIN_DPR = 0.75;
const DPR_STEP = 0.25;

// Región del jugador (qué se dibuja) y si pisa el lodo del pantano (lo que despierta a los enemigos).
// Solo escribe en el store cuando algo cambia, así nadie se vuelve a renderizar en cada cuadro.
const ZoneTracker: React.FC = () => {
  useFrame(() => {
    const { x, z } = useAvatarStore.getState().playerPosition;
    const zone = useZoneStore.getState();
    const inPolygon = isPointInPolygon(x, z, PANTANO_POLYGON);
    const insidePantano = zone.insidePantano ? inPolygon || distanceToPolygonEdge(x, z, PANTANO_POLYGON) < PANTANO_EXIT_MARGIN : inPolygon;
    if (insidePantano !== zone.insidePantano) zone.setInsidePantano(insidePantano);
    const region = classifyRegion(x, z, zone.region);
    if (region !== zone.region) zone.setRegion(region);
  });

  return null;
};

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// Montado al final del <Suspense>: corre cuando ya cargó todo. Con `warming` cada parte del mundo se dibuja sin importar
// la región, y compileAsync prepara todos los materiales detrás de la pantalla de carga. Después cada parte vuelve a
// mostrarse solo desde donde se ve, y aparecer más tarde ya no cuesta un tirón.
const Warmup: React.FC = () => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await nextFrame();
      await nextFrame();
      try {
        await (gl as unknown as { compileAsync?: (s: typeof scene, c: typeof camera) => Promise<void> }).compileAsync?.(scene, camera);
      } catch (error) {
        console.warn('No se pudieron precompilar los materiales:', error);
      }
      await nextFrame();
      await nextFrame();
      if (!cancelled) useWorldStore.getState().finishWarmup();
    })();
    return () => {
      cancelled = true;
      useWorldStore.getState().resetWorld();
    };
  }, [gl, scene, camera]);

  return null;
};

export const WorldScene: React.FC = () => {
  const [dpr, setDpr] = useState(MAX_DPR);

  return (
    <Canvas
      camera={{ position: [0, 1.5, 2], far: 450 }}
      dpr={dpr}
      gl={createWebGPURenderer}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((current) => Math.max(MIN_DPR, current - DPR_STEP))}
        onIncline={() => setDpr((current) => Math.min(MAX_DPR, current + DPR_STEP))}
        onFallback={() => setDpr(MIN_DPR)}
        flipflops={4}
      />
      <Ambience />
      <ZoneTracker />
      <Suspense fallback={null}>
        <Physics>
          <Map />
          <Npcs />
          <Enemies />
          <Objects />
          <KeyboardControls map={KEYBOARD_MAP}>
            <PlayerController>
              <Avatar />
            </PlayerController>
          </KeyboardControls>
        </Physics>
        <Warmup />
      </Suspense>
    </Canvas>
  );
};
