import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Vector3, type Group } from 'three';
import { useCameraCollider } from '@/game/engine/camera/useCameraCollider';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { DESAFIO2_MODELS } from '../assets';
import { isMapaActivado } from '../mission';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO2_MODELS.bosqueOscuridad.muroOculto;

// Total vertical distance (m) the wall descends into the ground until its highest point is buried.
const SINK_DISTANCE = 45;
// Descent speed (m/s): takes ~5.5 seconds to fully submerge into the earth.
const SINK_SPEED = 8;

// Hidden rock wall of the Dark Forest (BosqueMuroOculto.glb). Always blocks the mountain pass with trimesh physics.
// When the player activates the forest map, it rumbles downwards into the ground until it completely disappears,
// clearing the path to the next challenge.
export function BosqueMuroOculto() {
  const visible = useVisibleFrom(VISIBLE_FROM.muroOculto);
  const { scene } = useGLTF(URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  const rb = useRef<RapierRigidBody>(null);
  const group = useRef<Group>(null);

  const mapaActivado = useProgressStore((state) => isMapaActivado(state.progress));

  // Starts already sunken if the player previously activated the map in a past session.
  const [wasActiveOnMount] = useState(() => isMapaActivado(useProgressStore.getState().progress));
  const currentSink = useRef(wasActiveOnMount ? SINK_DISTANCE : 0);
  const [isFullySunken, setIsFullySunken] = useState(wasActiveOnMount);
  const initialPosition = useMemo<[number, number, number]>(() => [0, wasActiveOnMount ? -SINK_DISTANCE : 0, 0], [wasActiveOnMount]);
  const tempVec = useMemo(() => new Vector3(), []);

  // Story restart (second or third bajo): brings the wall back up.
  useEffect(() => {
    if (!mapaActivado && currentSink.current > 0) {
      currentSink.current = 0;
      setIsFullySunken(false);
      rb.current?.setNextKinematicTranslation(tempVec.set(0, 0, 0));
    }
  }, [mapaActivado, tempVec]);

  // Keep camera from passing through the wall while it is standing.
  useCameraCollider(model, !isFullySunken && visible);

  useFrame((_, rawDelta) => {
    if (!rb.current || isFullySunken) return;
    const delta = Math.min(rawDelta, 0.1);

    if (mapaActivado && currentSink.current < SINK_DISTANCE) {
      currentSink.current = Math.min(SINK_DISTANCE, currentSink.current + SINK_SPEED * delta);
      rb.current.setNextKinematicTranslation(tempVec.set(0, -currentSink.current, 0));
      if (currentSink.current >= SINK_DISTANCE) {
        setIsFullySunken(true);
      }
    }
  });

  if (!visible) return null;
  // If it was already fully sunken on load and remains so, no physics or draw calls are needed.
  if (isFullySunken && wasActiveOnMount) return null;

  return (
    <RigidBody
      ref={rb}
      type="kinematicPosition"
      colliders="trimesh"
      includeInvisible
      position={initialPosition}
    >
      <group ref={group} visible={!isFullySunken} dispose={null}>
        <primitive object={model} />
      </group>
    </RigidBody>
  );
}

useGLTF.preload(URL);
