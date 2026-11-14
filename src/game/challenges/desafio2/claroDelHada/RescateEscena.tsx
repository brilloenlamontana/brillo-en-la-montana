import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MathUtils, Matrix4, Object3D, Quaternion, Vector3, type InstancedMesh, type Mesh, type MeshStandardMaterial, type PointLight } from 'three';
import { useProgressStore } from '@/store/progressStore';
import { HADA_PEDESTAL } from './lugares';
import { avanzarRescate, rescateVivo, TALLOS, terminarRescate, useClaroStore } from './rescate';

const UP = new Vector3(0, 1, 0);
const GLIDE = 4;
// The camera while a knot is watched and cut: behind the avatar and to one side, low, with the knot in the middle
// and the fairy on her pedestal beyond it. Metres out from the knot (away from the pedestal), aside and above it.
const CAMARA = { fuera: 2.7, lado: 1.8, alto: 0.8, mira: { dentro: 0.9, alto: 0.35 } };
// The sap of a knot at rest and lit by the pulse: how strongly it glows, and the light it sheds around.
const SAVIA = { reposo: 0.35, pulso: 4.5 };
const LUZ = { color: '#c8ff7a', brillo: 5, alcance: 5 };
// Bits of bramble: how many at most, how many fly from a cut and from a miss, and how long each lives (s).
const TROZOS = 32;
const POR_CORTE = 20;
const POR_REBOTE = 6;
const VIDA = 0.8;

type Trozo = { position: Vector3; velocity: Vector3; life: number };
type Parte = { tallo: Object3D | null; nudo: Object3D | null; tocon: Object3D | null; savia: MeshStandardMaterial | null };

// Where the camera stands and looks for each knot.
const VISTAS = TALLOS.map(({ en }) => {
  const fuera = new Vector3(en.x - HADA_PEDESTAL[0], 0, en.z - HADA_PEDESTAL[2]).normalize();
  // To the side that opens toward the trail (+z), where the clearing is widest.
  const lado = new Vector3(fuera.z, 0, -fuera.x);
  if (lado.z < -1e-6) lado.negate();
  return {
    position: en.clone().addScaledVector(fuera, CAMARA.fuera).addScaledVector(lado, CAMARA.lado).setY(en.y + CAMARA.alto),
    lookAt: en.clone().addScaledVector(fuera, -CAMARA.mira.dentro).setY(en.y + CAMARA.mira.alto),
  };
});

// Moves a point toward another, easing in (the camera going from one knot's view to the next).
function deslizar(point: Vector3, to: Vector3, delta: number) {
  point.set(MathUtils.damp(point.x, to.x, GLIDE, delta), MathUtils.damp(point.y, to.y, GLIDE, delta), MathUtils.damp(point.z, to.z, GLIDE, delta));
}

// Sizes a part of the model around its own origin (the knot, for a stalk), turned a little around it.
function colocar(node: Object3D | null, scale: number, visible: boolean, twist = 0) {
  if (!node) return;
  node.visible = visible;
  node.scale.setScalar(Math.max(0.001, scale));
  node.rotation.y = twist;
  node.updateMatrix();
}

// The rescue of the fairy inside the canvas: it moves the game forward every frame, shows each stalk as it is (whole,
// recoiling from the cut, gone), runs the pulse of sap down the stalk in turn, lights its knot, throws bits of bramble
// at each cut and takes the camera to the knot. `model` is "ClaroInteractivos" (the stalks are parts of it) and
// `visible` says whether the clearing is drawn.
export function RescateEscena({ model, visible }: { model: Object3D; visible: boolean }) {
  const liberada = useProgressStore((state) => state.progress.hadaLiberada);
  const weight = useRef(0);
  const pulso = useRef<Mesh>(null);
  const trozos = useRef<InstancedMesh>(null);
  const luz = useRef<PointLight>(null);
  const vivos = useRef<Trozo[] | null>(null);
  const seen = useRef({ cortados: rescateVivo.cortados, fallos: 0, next: 0, staged: false });
  const work = useMemo(() => ({ matrix: new Matrix4(), facing: new Quaternion(), dummy: new Object3D(), at: new Vector3(), look: new Vector3(), screen: new Vector3() }), []);
  // The parts of each stalk; each knot gets its own sap material, so that only the one in turn lights up.
  const partes = useMemo<Parte[]>(
    () =>
      TALLOS.map(({ tallo, nudo, tocon }) => {
        const knot = model.getObjectByName(nudo) ?? null;
        let savia: MeshStandardMaterial | null = null;
        knot?.traverse((child) => {
          const mesh = child as Mesh;
          if (!mesh.isMesh || Array.isArray(mesh.material) || !mesh.material.name.includes('Savia')) return;
          savia = (mesh.material as MeshStandardMaterial).clone();
          savia.emissive = new Color('#b9ff5c');
          mesh.material = savia;
        });
        return { tallo: model.getObjectByName(tallo) ?? null, nudo: knot, tocon: model.getObjectByName(tocon) ?? null, savia };
      }),
    [model],
  );

  // Leaving the clearing's part of the world ends it.
  useEffect(() => terminarRescate, []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!visible) return terminarRescate();
    avanzarRescate(performance.now());
    const { rescate } = useClaroStore.getState();
    const fase = rescate?.fase ?? null;
    const { cortados } = rescateVivo;
    // The stalk the scene is about: the one just cut while it withers, the one in turn otherwise.
    const turno = Math.min(TALLOS.length - 1, fase === 'seca' || fase === 'fin' ? cortados - 1 : cortados);

    // The stalks: whole, tightening after a miss, recoiling to the knot once cut, gone.
    const squeeze = fase === 'aprieta' ? Math.sin(Math.PI * rescateVivo.aprieta) : 0;
    partes.forEach(({ tallo, nudo, tocon, savia }, i) => {
      const cut = liberada || i < cortados;
      const withering = !liberada && fase === 'seca' && i === cortados - 1;
      const gone = withering ? MathUtils.smoothstep(rescateVivo.seca, 0, 1) : cut ? 1 : 0;
      const shake = squeeze * 0.03 * Math.sin(clock.elapsedTime * 38 + i * 2);
      colocar(tallo, (1 - gone) * (1 - 0.05 * squeeze), gone < 1, shake + gone * 0.9);
      colocar(nudo, 1 - MathUtils.smoothstep(gone, 0, 0.35) + (i === turno && !cut ? 0.1 * rescateVivo.brillo : 0), gone < 0.35, shake);
      colocar(tocon, 1, true);
      if (savia) savia.emissiveIntensity = !cut && i === turno && fase !== null ? SAVIA.reposo + SAVIA.pulso * rescateVivo.brillo : SAVIA.reposo;
    });

    // The pulse of sap, from the fairy down to the knot, and the light of the knot.
    const { en, pulso: curve } = TALLOS[turno];
    if (pulso.current) {
      pulso.current.visible = fase === 'acecho' && rescateVivo.pulso > 0.04;
      if (pulso.current.visible) {
        curve.getPoint(rescateVivo.pulso, pulso.current.position);
        pulso.current.scale.setScalar(0.8 + 0.5 * rescateVivo.pulso + 0.15 * Math.sin(clock.elapsedTime * 30));
      }
    }
    if (luz.current) {
      luz.current.position.set(en.x, en.y + 0.1, en.z);
      luz.current.intensity = fase === 'acecho' || fase === 'tajo' ? LUZ.brillo * rescateVivo.brillo : 0;
    }

    // Bits of bramble fly from each cut; a few sparks of sap from each miss.
    const mesh = trozos.current;
    const bits = (vivos.current ??= Array.from({ length: TROZOS }, () => ({ position: new Vector3(), velocity: new Vector3(), life: 0 })));
    if (mesh) {
      const cutNow = cortados > seen.current.cortados;
      const missNow = rescateVivo.fallos > seen.current.fallos;
      seen.current.cortados = cortados;
      seen.current.fallos = rescateVivo.fallos;
      if (cutNow || missNow) {
        const from = TALLOS[Math.min(TALLOS.length - 1, cutNow ? cortados - 1 : cortados)].en;
        for (let i = 0; i < (cutNow ? POR_CORTE : POR_REBOTE); i++) {
          const bit = bits[seen.current.next];
          seen.current.next = (seen.current.next + 1) % TROZOS;
          bit.position.copy(from);
          bit.velocity.set((Math.random() - 0.5) * 2.6, 0.6 + Math.random() * 2.2, (Math.random() - 0.5) * 2.6);
          bit.life = VIDA * (0.5 + Math.random() * 0.5);
        }
      }
      let alive = false;
      bits.forEach((bit, i) => {
        if (bit.life > 0) {
          alive = true;
          bit.life -= dt;
          bit.velocity.y -= 7 * dt;
          bit.position.addScaledVector(bit.velocity, dt);
          work.dummy.position.copy(bit.position);
          work.dummy.rotation.set(bit.life * 9, bit.life * 13 + i, 0);
          work.dummy.scale.setScalar(Math.max(0, Math.min(1, bit.life * 4)));
        } else {
          work.dummy.scale.setScalar(0);
        }
        work.dummy.updateMatrix();
        mesh.setMatrixAt(i, work.dummy.matrix);
      });
      mesh.visible = alive;
      mesh.instanceMatrix.needsUpdate = true;
    }

    // The camera, after the player's controls have placed it: it goes to the knot in turn (gliding from one knot's
    // view to the next) and back to the player when the avatar walks or it all ends.
    const staged = fase !== null && fase !== 'camino';
    weight.current = MathUtils.damp(weight.current, staged ? 1 : 0, GLIDE, dt);
    rescateVivo.pantalla.visible = false;
    if (weight.current < 0.002) {
      weight.current = 0;
      seen.current.staged = false;
      return;
    }
    const vista = VISTAS[turno];
    if (!seen.current.staged) {
      seen.current.staged = true;
      work.at.copy(vista.position);
      work.look.copy(vista.lookAt);
    } else {
      deslizar(work.at, vista.position, dt);
      deslizar(work.look, vista.lookAt, dt);
    }
    const w = MathUtils.smoothstep(weight.current, 0, 1);
    camera.position.lerp(work.at, w);
    camera.quaternion.slerp(work.facing.setFromRotationMatrix(work.matrix.lookAt(camera.position, work.look, UP)), w);
    camera.updateMatrixWorld();

    // Where the knot is on screen, for the ring of the HUD.
    if (fase === 'acecho' && weight.current > 0.85) {
      work.screen.copy(en).project(camera);
      rescateVivo.pantalla.x = (work.screen.x + 1) / 2;
      rescateVivo.pantalla.y = (1 - work.screen.y) / 2;
      rescateVivo.pantalla.visible = work.screen.z < 1;
    }
  });

  return (
    <>
      <mesh ref={pulso} visible={false} frustumCulled={false}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#e6ffa0" toneMapped={false} />
      </mesh>
      <instancedMesh ref={trozos} args={[undefined, undefined, TROZOS]} frustumCulled={false} visible={false}>
        <tetrahedronGeometry args={[0.035]} />
        <meshBasicMaterial color="#8fae3c" />
      </instancedMesh>
      <pointLight ref={luz} color={LUZ.color} intensity={0} distance={LUZ.alcance} decay={2} />
    </>
  );
}
