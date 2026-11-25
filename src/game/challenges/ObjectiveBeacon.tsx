import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, type Group } from 'three';
import { beaconMaterial, beaconStrength } from '@/game/engine/rendering/beacon';
import { usePlayerStore } from '@/game/player/playerStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { currentObjective } from './registry';

// How tall the column of light is, and how wide its heart and the glow around it.
const HEIGHT = 70;
const CORE_RADIUS = 0.55;
const GLOW_RADIUS = 1.9;
// The light starts a little under the ground, so no slope shows its foot floating.
const SUNK = 2;
// It fades out between these distances (m) as the player arrives: at the place itself it would only be in the way.
const GONE_AT = 9;
const FULL_AT = 24;

// A column of golden light over the place the story sends the player to next (the objective of the challenge being
// played: see each mission.ts), seen from far away and over hills and trees. It follows the story on its own: when a
// step is done it moves to the next place. It is not drawn indoors, in the tunnels (the compass guides there) or
// during a cinematic.
export function ObjectiveBeacon() {
  // The line of the objective changes with every step: the place is read again only then.
  const region = useZoneStore((state) => state.region);
  const text = useProgressStore((state) => currentObjective(state.progress, region)?.text ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `text` stands for the step: its place only changes with it.
  const at = useMemo(() => currentObjective(useProgressStore.getState().progress, region)?.at ?? null, [text]);
  const hidden = useZoneStore((state) => state.interior !== null || state.region === 'tuneles');
  const cinematic = useUIStore((state) => state.cinematic);
  const group = useRef<Group>(null);
  const parts = useMemo(() => {
    const column = (radius: number) => new CylinderGeometry(radius, radius, HEIGHT, 20, 1, true);
    return { core: column(CORE_RADIUS), glow: column(GLOW_RADIUS), coreMaterial: beaconMaterial(true), glowMaterial: beaconMaterial(false) };
  }, []);
  const shown = at !== null && !hidden && !cinematic;

  useFrame(() => {
    if (!shown || !at) return;
    const { x, z } = usePlayerStore.getState().position;
    const distance = Math.hypot(at.x - x, at.z - z);
    const near = Math.min(1, Math.max(0, (distance - GONE_AT) / (FULL_AT - GONE_AT)));
    beaconStrength.value = near * near * (3 - 2 * near);
    if (group.current) group.current.visible = near > 0;
  });

  if (!shown || !at) return null;

  return (
    <group ref={group} position={[at.x, at.y - SUNK + HEIGHT / 2, at.z]} renderOrder={5}>
      <mesh geometry={parts.glow} material={parts.glowMaterial} />
      <mesh geometry={parts.core} material={parts.coreMaterial} />
    </group>
  );
}
