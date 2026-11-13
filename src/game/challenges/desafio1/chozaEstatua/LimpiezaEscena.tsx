import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, MathUtils, Matrix4, Object3D, Quaternion, Vector3, type InstancedMesh } from 'three';
import { restPose } from '@/game/engine/models/sceneUtils';
import { useProgressStore } from '@/store/progressStore';
import { avanzarLimpieza, bancoDeLimpieza, limpiezaViva, manoDeLimpieza, terminarLimpieza, useChozaStore, ZONAS } from './limpieza';

const UP = new Vector3(0, 1, 0);
// The camera while the face is cleaned: to the avatar's right, near and a little above, so the hand and the face show.
const CAMARA = { position: new Vector3(-63.56, 11.3, -96.16), lookAt: new Vector3(-62.82, 10.95, -94.3) };
const GLIDE = 4;
// A zone of moss comes off shrinking toward its middle and sinking this much (m).
const CAIDA = 0.12;
// Bits of moss fall from under the rag: how many at most, how often one comes off (s) and how long it lasts (s).
const TROZOS = 14;
const CADA = 0.07;
const VIDA = 0.9;
const BANCO_LADO = 0.42;
const BANCO_COLOR = '#6b4a2b';
const MOHO_COLOR = '#4d6a2c';

type Zona = { node: Object3D; rest: Vector3; middle: Vector3; shown: number };
type Trozo = { position: Vector3; velocity: Vector3; life: number; spin: number };
const nuevosTrozos = (): Trozo[] => Array.from({ length: TROZOS }, () => ({ position: new Vector3(), velocity: new Vector3(), life: 0, spin: 0 }));

// The cleaning of the statue's face inside the canvas: it moves the game forward every frame, takes the camera to the
// side of the statue, makes each zone of moss come off as it is rubbed, drops bits of moss from the hand and puts a
// stool under a short avatar. `interior` is the model of the hut's inside (the moss is part of it).
export function LimpiezaEscena({ interior }: { interior: Object3D }) {
  const fase = useChozaStore((state) => state.limpieza?.fase ?? null);
  const limpia = useProgressStore((state) => state.progress.estatuaLimpia);
  // The stool is there from the moment the avatar steps up.
  const banco = fase !== null && fase !== 'camino' ? bancoDeLimpieza() : null;
  const weight = useRef(0);
  const trozos = useRef<InstancedMesh>(null);
  const work = useMemo(() => ({ matrix: new Matrix4(), facing: new Quaternion(), dummy: new Object3D() }), []);
  const trozosVivos = useRef<Trozo[] | null>(null);
  const emit = useRef({ next: 0, since: 0 });

  // Each zone of moss, with where it rests and its middle (in its own space: it shrinks toward it).
  const zonas = useMemo(() => {
    interior.updateMatrixWorld(true);
    return ZONAS.flatMap(({ node: name }): Zona[] => {
      const node = interior.getObjectByName(name);
      if (!node) return [];
      // From how the model came (an earlier cleaning may have left it half-way).
      const rest = restPose(node).position;
      node.position.copy(rest);
      node.scale.setScalar(1);
      node.updateMatrix();
      node.updateMatrixWorld(true);
      const middle = node.worldToLocal(new Box3().setFromObject(node).getCenter(new Vector3()));
      return [{ node, rest, middle, shown: -1 }];
    });
  }, [interior]);

  // Leaving the hut's part of the world ends it.
  useEffect(() => terminarLimpieza, []);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    avanzarLimpieza(performance.now(), dt);
    const { limpieza } = useChozaStore.getState();

    // The moss: zone i is gone by (avance - i), from 0 (whole) to 1.
    zonas.forEach((zona, i) => {
      const gone = limpia ? 1 : MathUtils.clamp(limpiezaViva.avance - i, 0, 1);
      if (gone === zona.shown) return;
      zona.shown = gone;
      const { node, rest, middle } = zona;
      node.visible = gone < 1;
      node.scale.setScalar(Math.max(0.001, 1 - gone));
      node.position.copy(rest).addScaledVector(middle, gone);
      node.position.y -= CAIDA * gone;
      node.updateMatrix();
      node.updateMatrixWorld(true);
    });

    // Bits of moss fall while the hand rubs.
    const mesh = trozos.current;
    const bits = (trozosVivos.current ??= nuevosTrozos());
    if (mesh) {
      const rubbing = limpieza?.fase === 'frota' && limpiezaViva.frotando;
      emit.current.since += dt;
      if (rubbing && emit.current.since >= CADA) {
        emit.current.since = 0;
        const bit = bits[emit.current.next];
        emit.current.next = (emit.current.next + 1) % TROZOS;
        bit.position.copy(manoDeLimpieza());
        bit.velocity.set((Math.random() - 0.5) * 0.7, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.7);
        bit.life = VIDA;
        bit.spin = Math.random() * 6;
      }
      let alive = false;
      bits.forEach((bit, i) => {
        if (bit.life > 0) {
          alive = true;
          bit.life -= dt;
          bit.velocity.y -= 4.5 * dt;
          bit.position.addScaledVector(bit.velocity, dt);
          work.dummy.position.copy(bit.position);
          work.dummy.rotation.set(bit.spin, bit.spin * 1.3 + bit.life * 5, 0);
          work.dummy.scale.setScalar(Math.max(0, Math.min(1, bit.life * 3)));
        } else {
          work.dummy.scale.setScalar(0);
        }
        work.dummy.updateMatrix();
        mesh.setMatrixAt(i, work.dummy.matrix);
      });
      mesh.visible = alive;
      mesh.instanceMatrix.needsUpdate = true;
    }

    // The camera, after the player's controls have placed it; it glides back to them when the cleaning ends.
    weight.current = MathUtils.damp(weight.current, limpieza && limpieza.fase !== 'camino' ? 1 : 0, GLIDE, dt);
    if (weight.current < 0.002) {
      weight.current = 0;
      return;
    }
    const w = MathUtils.smoothstep(weight.current, 0, 1);
    camera.position.lerp(CAMARA.position, w);
    camera.quaternion.slerp(work.facing.setFromRotationMatrix(work.matrix.lookAt(camera.position, CAMARA.lookAt, UP)), w);
    camera.updateMatrixWorld();
  });

  return (
    <>
      <instancedMesh ref={trozos} args={[undefined, undefined, TROZOS]} frustumCulled={false} visible={false}>
        <boxGeometry args={[0.03, 0.012, 0.025]} />
        <meshStandardMaterial color={MOHO_COLOR} roughness={1} />
      </instancedMesh>
      {banco && (
        <mesh position={[banco.x, banco.y + banco.alto / 2, banco.z]} rotation-y={banco.yaw}>
          <boxGeometry args={[BANCO_LADO, banco.alto, BANCO_LADO]} />
          <meshStandardMaterial color={BANCO_COLOR} roughness={0.9} />
        </mesh>
      )}
    </>
  );
}
