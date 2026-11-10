import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { useZoneStore } from '@/game/world/zoneStore';
import { CINEMATIC_SECONDS, SHOT_SECONDS, SHOTS, useCinematicaStore } from './cinematica';

// The camera of the final cinematic (inside the canvas). While it plays it takes the camera every frame, after the
// player's camera controls have placed it, glides it along the current shot, and sets the zone to the part of the map
// that shot shows (ZoneTracker stands aside during a cinematic), so that part is drawn. When the last shot ends the
// cinematic finishes; the camera controls then put the camera back behind the avatar by themselves.
export function CinematicaFinal() {
  const work = useMemo(() => ({ from: new Vector3(), to: new Vector3(), lookAt: new Vector3() }), []);

  useFrame(({ camera }) => {
    const { startedAt, finish } = useCinematicaStore.getState();
    if (startedAt === null) return;
    const elapsed = (performance.now() - startedAt) / 1000;
    if (elapsed >= CINEMATIC_SECONDS) {
      finish();
      return;
    }
    const index = Math.min(SHOTS.length - 1, Math.floor(elapsed / SHOT_SECONDS));
    const shot = SHOTS[index];
    const zone = useZoneStore.getState();
    if (zone.region !== shot.region || zone.interior !== null) zone.setZone(shot.region, null);

    const t = MathUtils.smootherstep(elapsed / SHOT_SECONDS - index, 0, 1);
    camera.position.lerpVectors(work.from.set(...shot.from), work.to.set(...shot.to), t);
    camera.up.set(0, 1, 0);
    camera.lookAt(work.lookAt.set(...shot.lookAt));
    camera.updateMatrixWorld();
  });

  return null;
}
