import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, MathUtils, Matrix4, Object3D, Quaternion, Vector3, type InstancedMesh, type PointLight } from 'three';
import { restPose } from '@/game/engine/models/sceneUtils';
import { useProgressStore } from '@/store/progressStore';
import { avanzarEncendido, chispasDesde, encendidoVivo, PLATO, terminarEncendido } from './encendido';
import { enElMundo, useChozaStore } from './limpieza';

const UP = new Vector3(0, 1, 0);
// The camera while the fire is lit: in front of the plate, low, with the statue behind it.
const CAMARA = (() => {
  const at = enElMundo([3.7, -1.1]);
  const look = enElMundo([0.95, 0.25]);
  return { position: new Vector3(at.x, 10.55, at.z), lookAt: new Vector3(look.x, 10.05, look.z) };
})();
const GLIDE = 4;
// Sparks: how many at most, how many fly per strike and how long each lives (s).
const CHISPAS = 24;
const POR_GOLPE = 7;
const VIDA = 0.45;
const CHISPA_COLOR = '#ffd27a';
// The fire's light: its colour, how bright it is once settled and how far it reaches (m).
const LUZ = { color: '#ff9a3c', brillo: 9, alcance: 9 };
// How big the flames get at their peak (times their settled size), around the statue.
const PICO = 2.7;

type Chispa = { position: Vector3; velocity: Vector3; life: number };
const nuevasChispas = (): Chispa[] => Array.from({ length: CHISPAS }, () => ({ position: new Vector3(), velocity: new Vector3(), life: 0 }));
type Parte = { node: Object3D; rest: Vector3; middle: Vector3 };

// How big the flames are (times their settled size) as they go from 0 to 1: they catch, rise around the statue and
// settle.
const tamano = (llamas: number) => (llamas < 0.12 ? MathUtils.lerp(0.15, 0.6, llamas / 0.12) : llamas < 0.5 ? MathUtils.lerp(0.6, PICO, MathUtils.smoothstep(llamas, 0.12, 0.5)) : MathUtils.lerp(PICO, 1, MathUtils.smoothstep(llamas, 0.5, 1)));

function parte(interior: Object3D, name: string, fromBottom: boolean): Parte | null {
  const node = interior.getObjectByName(name);
  if (!node) return null;
  const rest = restPose(node).position;
  node.position.copy(rest);
  node.scale.setScalar(1);
  node.updateMatrix();
  node.updateMatrixWorld(true);
  const box = new Box3().setFromObject(node);
  const middle = box.getCenter(new Vector3());
  if (fromBottom) middle.y = box.min.y;
  return { node, rest, middle: node.worldToLocal(middle) };
}

// Sizes a part of the model around its middle (see `parte`).
function escalar({ node, rest, middle }: Parte, scale: number, visible: boolean) {
  node.visible = visible;
  node.scale.setScalar(Math.max(0.001, scale));
  node.position.copy(rest).addScaledVector(middle, 1 - scale);
  node.updateMatrix();
  node.updateMatrixWorld(true);
}

// Lighting the fire inside the canvas: it moves the game forward every frame, takes the camera in front of the plate,
// throws sparks at each strike, makes the flames rise and settle and the moss on the statue's body burn away, and
// lights the hut while the fire burns. `interior` is the model of the hut's inside (fire and moss are parts of it).
export function EncendidoEscena({ interior }: { interior: Object3D }) {
  const encendida = useProgressStore((state) => state.progress.estatuaEncendida);
  const weight = useRef(0);
  const chispas = useRef<InstancedMesh>(null);
  const luz = useRef<PointLight>(null);
  const vivas = useRef<Chispa[] | null>(null);
  const seen = useRef({ golpeAt: -Infinity, next: 0, shown: '' });
  const work = useMemo(() => ({ matrix: new Matrix4(), facing: new Quaternion(), dummy: new Object3D() }), []);
  const partes = useMemo(() => {
    interior.updateMatrixWorld(true);
    return { fuego: parte(interior, 'EstatuaFuego', true), moho: parte(interior, 'EstatuaMohoCuerpo', false) };
  }, [interior]);

  // Leaving the hut's part of the world ends it.
  useEffect(() => terminarEncendido, []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const now = performance.now();
    avanzarEncendido(now, dt);
    const { encendido } = useChozaStore.getState();
    const llamas = encendido?.fase === 'llamas' ? encendidoVivo.llamas : 0;
    const prendido = encendida || llamas > 0;

    // The fire and the moss of the body (only touched when something changes).
    const size = llamas > 0 ? tamano(llamas) : 1;
    const burnt = encendida ? 1 : MathUtils.smoothstep(llamas, 0.3, 0.6);
    const shown = `${prendido}|${size.toFixed(3)}|${burnt.toFixed(3)}`;
    if (shown !== seen.current.shown) {
      seen.current.shown = shown;
      if (partes.fuego) escalar(partes.fuego, size, prendido);
      if (partes.moho) escalar(partes.moho, 1 - burnt, burnt < 1);
    }
    if (luz.current) {
      const flicker = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 11) * Math.sin(clock.elapsedTime * 7.3);
      luz.current.intensity = prendido ? LUZ.brillo * size * flicker : encendido?.fase === 'chispa' ? LUZ.brillo * 0.25 * encendidoVivo.brasa : 0;
    }

    // Sparks fly at each strike.
    const mesh = chispas.current;
    const bits = (vivas.current ??= nuevasChispas());
    if (mesh) {
      if (encendidoVivo.golpeAt !== seen.current.golpeAt) {
        seen.current.golpeAt = encendidoVivo.golpeAt;
        if (encendido?.fase === 'chispa' || encendido?.fase === 'llamas') {
          for (let i = 0; i < POR_GOLPE; i++) {
            const bit = bits[seen.current.next];
            seen.current.next = (seen.current.next + 1) % CHISPAS;
            bit.position.copy(chispasDesde());
            bit.velocity.set((Math.random() - 0.5) * 1.6, 0.2 + Math.random() * 1.1, (Math.random() - 0.5) * 1.6);
            bit.life = VIDA * (0.6 + Math.random() * 0.4);
          }
        }
      }
      let alive = false;
      bits.forEach((bit, i) => {
        if (bit.life > 0) {
          alive = true;
          bit.life -= dt;
          bit.velocity.y -= 6 * dt;
          bit.position.addScaledVector(bit.velocity, dt);
          work.dummy.position.copy(bit.position);
          work.dummy.scale.setScalar(Math.max(0, Math.min(1, bit.life * 5)));
        } else {
          work.dummy.scale.setScalar(0);
        }
        work.dummy.updateMatrix();
        mesh.setMatrixAt(i, work.dummy.matrix);
      });
      mesh.visible = alive;
      mesh.instanceMatrix.needsUpdate = true;
    }

    // The camera, after the player's controls have placed it; it glides back to them when it ends.
    weight.current = MathUtils.damp(weight.current, encendido && encendido.fase !== 'camino' ? 1 : 0, GLIDE, dt);
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
      <instancedMesh ref={chispas} args={[undefined, undefined, CHISPAS]} frustumCulled={false} visible={false}>
        <boxGeometry args={[0.018, 0.018, 0.018]} />
        <meshBasicMaterial color={CHISPA_COLOR} />
      </instancedMesh>
      <pointLight ref={luz} position={[PLATO.x, PLATO.y + 0.55, PLATO.z]} color={LUZ.color} intensity={0} distance={LUZ.alcance} decay={2} />
    </>
  );
}
