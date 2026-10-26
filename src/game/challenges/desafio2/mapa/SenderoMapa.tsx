import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CatmullRomCurve3,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';
import { useTerrainHeight } from '@/game/engine/physics/useTerrainHeight';
import { usePlayerStore } from '@/game/player/playerStore';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { useBosqueStore } from '../bosqueStore';
import { isMapaActivado } from '../mission';
import { VISIBLE_FROM } from '../visibility';
import { SENDERO_BOSQUE } from './senderoBosque';

// Distance (m) between two arrows of the trail.
const SPACING = 1.8;
// Arrows float this much over the ground so they never flicker against it.
const HOVER = 0.08;
// Arrows kept behind the player, so the trail starts at their feet.
const BEHIND = 2;
// The glow runs along the trail toward the exit at this speed (m/s), one crest every WAVE_LENGTH meters.
const WAVE_SPEED = 7;
const WAVE_LENGTH = 9;
// When the map is used, the trail spreads from the player toward the exit at this speed (m/s).
const REVEAL_SPEED = 45;
// The trail counts as revealed by the map if it appears this soon after the map was used.
const JUST_USED_MS = 1500;

type Marker = { position: Vector3; along: number; ground: number | null };

// A flat golden chevron pointing to +z.
function chevronGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0.42);
  shape.lineTo(0.42, 0);
  shape.lineTo(0.42, -0.2);
  shape.lineTo(0, 0.2);
  shape.lineTo(-0.42, -0.2);
  shape.lineTo(-0.42, 0);
  shape.closePath();
  return new ShapeGeometry(shape).rotateX(Math.PI / 2);
}

// Arrows evenly spaced along the route, smoothed through its points.
function buildMarkers(): Marker[] {
  const curve = new CatmullRomCurve3(
    SENDERO_BOSQUE.map(([x, y, z]) => new Vector3(x, y, z)),
    false,
    'centripetal',
  );
  const count = Math.ceil(curve.getLength() / SPACING);
  return curve.getSpacedPoints(count).map((position, i) => ({ position, along: i * SPACING, ground: null }));
}

const FORWARD = new Vector3(0, 0, 1);

type TerrainHeight = (x: number, z: number, fromY: number, maxDrop: number) => number | null;

// Everything the trail draws and remembers, created once per appearance and updated outside React every frame.
type Trail = {
  markers: Marker[];
  mesh: InstancedMesh;
  // Revealed length ahead of the player (Infinity = all of it).
  revealed: number;
  work: { matrix: Matrix4; rotation: Quaternion; direction: Vector3; scale: Vector3; at: Vector3 };
};

function createTrail(revealFromPlayer: boolean): Trail {
  const markers = buildMarkers();
  const material = new MeshBasicMaterial({
    color: '#ffd75e',
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const mesh = new InstancedMesh(chevronGeometry(), material, markers.length);
  mesh.count = 0;
  mesh.frustumCulled = false; // only the stretch ahead of the player is filled in
  return {
    markers,
    mesh,
    revealed: revealFromPlayer ? 0 : Infinity,
    work: { matrix: new Matrix4(), rotation: new Quaternion(), direction: new Vector3(), scale: new Vector3(), at: new Vector3() },
  };
}

function disposeTrail({ mesh }: Trail) {
  mesh.dispose();
  mesh.geometry.dispose();
  (mesh.material as MeshBasicMaterial).dispose();
}

// One frame: lays the arrows on the ground, finds the player along the route and fills the arrows ahead of them.
function updateTrail(trail: Trail, player: Vector3, time: number, delta: number, terrainHeight: TerrainHeight) {
  const { markers, mesh, work } = trail;

  // Each arrow sits on the ground once its terrain collider exists.
  for (const marker of markers) {
    if (marker.ground !== null) continue;
    const { x, y, z } = marker.position;
    marker.ground = terrainHeight(x, z, y + 8, 20);
  }

  let nearest = 0;
  let nearestDistance = Infinity;
  markers.forEach((marker, i) => {
    const distance = Math.hypot(marker.position.x - player.x, marker.position.z - player.z);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = i;
    }
  });
  const origin = markers[nearest].along;
  if (Number.isFinite(trail.revealed)) trail.revealed += REVEAL_SPEED * delta;

  let count = 0;
  const last = markers.length - 1;
  for (let i = Math.max(0, nearest - BEHIND); i <= last; i++) {
    const marker = markers[i];
    if (marker.ground === null) continue;
    if (marker.along - origin > trail.revealed) break;
    // Each arrow points to the next one (the last one keeps the previous direction), tilted with the ground.
    const from = i === last ? markers[i - 1] : marker;
    const to = i === last ? marker : markers[i + 1];
    work.direction
      .set(to.position.x - from.position.x, (to.ground ?? to.position.y) - (from.ground ?? from.position.y), to.position.z - from.position.z)
      .normalize();
    work.rotation.setFromUnitVectors(FORWARD, work.direction);
    const crest = Math.max(0, Math.sin(((marker.along - time * WAVE_SPEED) / WAVE_LENGTH) * Math.PI * 2));
    work.scale.setScalar(0.85 + 0.35 * crest);
    work.at.set(marker.position.x, marker.ground + HOVER, marker.position.z);
    mesh.setMatrixAt(count++, work.matrix.compose(work.at, work.rotation, work.scale));
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
}

// The trail the elf's map reveals: once the map is used, golden arrows on the ground lead from wherever the player is
// to the forest exit, past the lowered rock wall. Only the stretch ahead of the player is drawn, so it always starts at
// their feet, and a glow flows along it toward the exit.
export function SenderoMapa() {
  const visible = useVisibleFrom(VISIBLE_FROM.sendero);
  const activado = useProgressStore((state) => isMapaActivado(state.progress));
  return visible && activado ? <Sendero /> : null;
}

function Sendero() {
  const terrainHeight = useTerrainHeight();
  // Right after the map is used the trail spreads from the player; coming back to the forest later it is all there.
  const [trail] = useState(() => {
    const usedAt = useBosqueStore.getState().mapaUsadoAt;
    return createTrail(usedAt !== null && performance.now() - usedAt < JUST_USED_MS);
  });
  useEffect(() => () => disposeTrail(trail), [trail]);

  useFrame((state, delta) => updateTrail(trail, usePlayerStore.getState().position, state.clock.elapsedTime, delta, terrainHeight));

  return <primitive object={trail.mesh} />;
}
