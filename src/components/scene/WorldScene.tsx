import React, { Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { KeyboardControls } from '@react-three/drei';
import { PANTANO_EXIT_MARGIN, PANTANO_POLYGON, VILLA_BOJ_ZONE } from '../../constants/zones';
import { usePlayerNear } from '../../hooks/usePlayerNear';
import { useAvatarStore } from '../../store/avatarStore';
import { useZoneStore } from '../../store/zoneStore';
import { distanceToPolygonEdge, isPointInPolygon } from '../../utils/polygon';
import { Ambience } from '../environment/Ambience';
import { Map } from '../models-3d/map/Map';
import { Npcs } from '../models-3d/npcs/Npcs';
import { Enemies } from '../models-3d/enemies/Enemies';
import { Objects } from '../models-3d/objects/Objects';
import { Avatar } from '../models-3d/avatar/Avatar';
import { PlayerController } from '../models-3d/avatar/PlayerController';
import { KEYBOARD_MAP } from '../../constants/keyboardMap';
import { createWebGPURenderer } from '../../utils/webgpuRenderer';

const ZoneTracker: React.FC = () => {
  const insideVillaBoj = usePlayerNear(VILLA_BOJ_ZONE);
  useEffect(() => {
    useZoneStore.getState().setInsideVillaBoj(insideVillaBoj);
  }, [insideVillaBoj]);

  useFrame(() => {
    const { x, z } = useAvatarStore.getState().playerPosition;
    const { insidePantano, setInsidePantano } = useZoneStore.getState();
    const inPolygon = isPointInPolygon(x, z, PANTANO_POLYGON);
    const next = insidePantano ? inPolygon || distanceToPolygonEdge(x, z, PANTANO_POLYGON) < PANTANO_EXIT_MARGIN : inPolygon;
    if (next !== insidePantano) setInsidePantano(next);
  });

  return null;
};

export const WorldScene: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2] }}
      gl={createWebGPURenderer}
    >
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
      </Suspense>
    </Canvas>
  );
};
