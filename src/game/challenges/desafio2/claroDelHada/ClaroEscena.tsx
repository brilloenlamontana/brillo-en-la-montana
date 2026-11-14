import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Box3, Group, MathUtils, Matrix4, Object3D, Quaternion, Vector3, type InstancedMesh, type PointLight } from 'three';
import { sleepingGlow } from '@/game/engine/rendering/glowMaterials';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { auxilioVivo, avanzarAuxilio, terminarAuxilio } from './auxilio';
import { useClaroStore } from './claroStore';
import { avanzarEntrega, entregaViva, terminarEntrega } from './entrega';
import { amuletoVivo, claroVivo, hadaViva, manosDelHada } from './hadaViva';
import { AMULETO_SITIO, ATRIL, ATRIL_DEDOS, AUXILIO_RODILLA, ENTREGA_PIE, HADA_PEDESTAL, HADA_SUELO } from './lugares';

const UP = new Vector3(0, 1, 0);
const GLIDE = 3.5;
// How far the roots of the lectern turn outward to open (rad) and how fast (1/s).
const RAICES = { abre: 1.15, rapidez: 1.6 };
// The lights of the clearing wake as a ring that spreads this far (m) from the pedestal; awake for good, it is huge.
const ONDA_RADIO = 17;
const DESPIERTO = 1e6;
// A soft light over the clearing once it is awake.
const LUZ = { color: '#bfe8ff', brillo: 14, alto: 4.5, alcance: 22 };
// Motes of light that rise as the ring passes: how many, how long each lives (s).
const MOTAS = 48;
const VIDA = 1.9;
// Fireflies that lead from the trail to the clearing while the fairy is caught: how many, from where to where.
const LUCIERNAGAS = 14;
const SENDA = { desde: new Vector3(40, 15.5, -213.5), hasta: new Vector3(40, 15.3, -226) };

// Where the camera stands and looks in each scene.
const haciaAvatar = new Vector3(AUXILIO_RODILLA.x - HADA_SUELO[0], 0, AUXILIO_RODILLA.z - HADA_SUELO[2]).normalize();
const VISTAS = {
  // Helping her up: behind the kneeling avatar and to one side, low.
  auxilio: {
    position: new Vector3(...HADA_SUELO).addScaledVector(haciaAvatar, 3.3).add(new Vector3(haciaAvatar.z, 0, -haciaAvatar.x).multiplyScalar(1.9)).setY(HADA_SUELO[1] + 1.25),
    lookAt: new Vector3(...HADA_SUELO).addScaledVector(haciaAvatar, 0.3).setY(HADA_SUELO[1] + 0.5),
  },
  // She takes off and the clearing wakes: from the trail, high, the whole ring of stones in view.
  despertar: { position: new Vector3(HADA_PEDESTAL[0] + 1.8, HADA_PEDESTAL[1] + 2.6, HADA_PEDESTAL[2] + 9), lookAt: new Vector3(HADA_PEDESTAL[0], HADA_PEDESTAL[1] + 0.9, HADA_PEDESTAL[2]) },
  // Receiving the amulet: from one side of the avatar kneeling in front of the lectern.
  entrega: {
    position: new Vector3(ENTREGA_PIE.x + 2.5, ATRIL[1] + 0.15, ENTREGA_PIE.z + 1.1),
    lookAt: new Vector3((ENTREGA_PIE.x + ATRIL[0]) / 2, ATRIL[1] - 0.35, (ENTREGA_PIE.z + ATRIL[2]) / 2),
  },
};

type Mota = { position: Vector3; life: number };

// The amulet where amuletoVivo says. In her hands and on the chest it hangs upright (turned by `yaw`); on the lectern
// it lies as modelled.
function colocarAmuleto(holder: Group, shown: boolean, upright: boolean, yaw: number) {
  holder.visible = shown && amuletoVivo.escala > 0.01;
  holder.position.copy(amuletoVivo.position);
  holder.scale.setScalar(Math.max(0.001, amuletoVivo.escala));
  holder.rotation.set(upright ? Math.PI / 2 : 0, yaw, 0);
}

function deslizar(point: Vector3, to: Vector3, delta: number) {
  point.set(MathUtils.damp(point.x, to.x, GLIDE, delta), MathUtils.damp(point.y, to.y, GLIDE, delta), MathUtils.damp(point.z, to.z, GLIDE, delta));
}

// The clearing inside the canvas, beyond the cutting of the brambles (RescateEscena): it moves the scenes of helping the
// fairy up and of receiving her amulet forward every frame and takes the camera to them; wakes the lights of the
// clearing as a ring that spreads when she takes off (awake for good once she is free); opens the roots of the
// lectern; puts the amulet where it is (on the lectern, in her hands, on the avatar's chest); and, while she is caught,
// leads from the trail with fireflies. `model` is "ClaroInteractivos" (the roots are parts of it), `amuletoUrl` the
// amulet's model and `visible` whether the clearing is drawn.
export function ClaroEscena({ model, amuletoUrl, visible }: { model: Object3D; amuletoUrl: string; visible: boolean }) {
  const liberada = useProgressStore((state) => state.progress.hadaLiberada);
  const completado = useProgressStore((state) => state.progress.bono2Completado);
  const world = useThree((state) => state.scene);
  const { scene: amuletoModel } = useGLTF(amuletoUrl);
  const weight = useRef(0);
  const motas = useRef<InstancedMesh>(null);
  const luciernagas = useRef<InstancedMesh>(null);
  const luz = useRef<PointLight>(null);
  const vivas = useRef<Mota[] | null>(null);
  const seen = useRef({ staged: false, next: 0, sembrado: 0, despierto: liberada ? 1 : 0, pecho: null as Object3D | null });
  const work = useMemo(() => ({ matrix: new Matrix4(), facing: new Quaternion(), dummy: new Object3D(), at: new Vector3(), look: new Vector3(), point: new Vector3(), axis: new Vector3() }), []);
  const dedos = useMemo(() => ATRIL_DEDOS.map(([name, x, z]) => ({ node: model.getObjectByName(name) ?? null, axis: new Vector3(x, 0, z) })), [model]);
  // The amulet, re-centered (its GLB is placed on the lectern): it is moved by its middle.
  const amuleto = useMemo(() => {
    const centered = amuletoModel.clone(true);
    centered.position.copy(new Box3().setFromObject(amuletoModel).getCenter(new Vector3())).negate();
    const holder = new Group();
    holder.add(centered);
    return holder;
  }, [amuletoModel]);

  useEffect(() => {
    sleepingGlow.center.value.set(HADA_PEDESTAL[0], HADA_PEDESTAL[2]);
    return () => {
      terminarAuxilio();
      terminarEntrega();
      sleepingGlow.radius.value = DESPIERTO;
    };
  }, []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const now = performance.now();
    if (!visible) {
      terminarAuxilio();
      terminarEntrega();
      return;
    }
    avanzarAuxilio(now, dt);
    avanzarEntrega(now, dt);
    const { auxilio, entrega } = useClaroStore.getState();
    const despertando = auxilio?.fase === 'despierta';

    // The lights of the clearing: asleep while she is caught, spreading as a ring when she takes off, awake after.
    const onda = despertando ? MathUtils.smoothstep(auxilioVivo.onda, 0, 1) : liberada && !auxilio ? 1 : 0;
    sleepingGlow.radius.value = onda >= 1 ? DESPIERTO : onda * ONDA_RADIO;
    seen.current.despierto = MathUtils.damp(seen.current.despierto, liberada ? 1 : 0, 1.2, dt);
    if (luz.current) luz.current.intensity = LUZ.brillo * seen.current.despierto * (despertando ? 0.4 + 0.6 * onda : 1);

    // The roots of the lectern open once she is free (and the scene of her rescue is over).
    claroVivo.raices = MathUtils.damp(claroVivo.raices, liberada && !auxilio ? 1 : 0, RAICES.rapidez, dt);
    dedos.forEach(({ node, axis }) => {
      if (!node) return;
      node.quaternion.setFromAxisAngle(axis, RAICES.abre * MathUtils.smoothstep(claroVivo.raices, 0, 1));
      node.updateMatrix();
    });

    // The amulet: on the avatar's chest (the scene of its delivery says where), in her hands, or on the lectern.
    const colgando = entrega !== null && (entrega.fase === 'cuelga' || entrega.fase === 'celebra' || entrega.fase === 'guarda');
    if (colgando) {
      // The avatar's chest, by its skeleton: of the spines in the world, the one over the avatar's feet.
      if (!seen.current.pecho) {
        const feet = usePlayerStore.getState().pose?.feet ?? usePlayerStore.getState().position;
        let best = 0.6;
        world.traverse((object) => {
          if (object.name !== 'mixamorigSpine2') return;
          const at = object.getWorldPosition(work.point);
          const distance = Math.hypot(at.x - feet.x, at.z - feet.z);
          if (distance < best) [best, seen.current.pecho] = [distance, object];
        });
      }
      entregaViva.pecho = seen.current.pecho ? (entregaViva.pecho ?? new Vector3()).copy(seen.current.pecho.getWorldPosition(work.point)) : null;
    } else {
      seen.current.pecho = null;
      amuletoVivo.escala = 1;
      if (hadaViva.conAmuleto) manosDelHada(amuletoVivo.position);
      else amuletoVivo.position.set(...AMULETO_SITIO);
    }
    colocarAmuleto(amuleto, !completado, hadaViva.conAmuleto || colgando, hadaViva.conAmuleto && !colgando ? hadaViva.yaw : 0);

    // Motes of light rise where the ring of waking passes.
    const mesh = motas.current;
    const bits = (vivas.current ??= Array.from({ length: MOTAS }, () => ({ position: new Vector3(), life: 0 })));
    if (mesh) {
      if (despertando && auxilioVivo.onda < 1) {
        seen.current.sembrado += dt * 22;
        while (seen.current.sembrado >= 1) {
          seen.current.sembrado -= 1;
          const bit = bits[seen.current.next];
          seen.current.next = (seen.current.next + 1) % MOTAS;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.max(0.8, onda * ONDA_RADIO * 0.55 - Math.random() * 1.5);
          bit.position.set(HADA_PEDESTAL[0] + Math.cos(angle) * radius, HADA_SUELO[1] + 0.1 + Math.random() * 0.4, HADA_PEDESTAL[2] + Math.sin(angle) * radius);
          bit.life = VIDA * (0.6 + Math.random() * 0.4);
        }
      }
      let alive = false;
      bits.forEach((bit, i) => {
        if (bit.life > 0) {
          alive = true;
          bit.life -= dt;
          bit.position.set(bit.position.x + 0.25 * Math.sin(bit.life * 5 + i) * dt, bit.position.y + 0.9 * dt, bit.position.z);
          work.dummy.position.copy(bit.position);
          work.dummy.scale.setScalar(Math.max(0, Math.min(1, bit.life * 2.5, (VIDA - bit.life) * 6)));
        } else {
          work.dummy.scale.setScalar(0);
        }
        work.dummy.updateMatrix();
        mesh.setMatrixAt(i, work.dummy.matrix);
      });
      mesh.visible = alive;
      mesh.instanceMatrix.needsUpdate = true;
    }

    // Fireflies drift from the trail toward the clearing while she is caught.
    const flies = luciernagas.current;
    if (flies) {
      flies.visible = !liberada && !auxilio;
      if (flies.visible) {
        const t = clock.elapsedTime;
        for (let i = 0; i < LUCIERNAGAS; i++) {
          const along = (i / LUCIERNAGAS + t * 0.035) % 1;
          work.point.set(0.9 * Math.sin(t * 0.7 + i * 2.4) + 0.4 * Math.sin(t * 1.9 + i), 0.35 * Math.sin(t * 1.3 + i * 1.7), 0.5 * Math.cos(t * 0.9 + i * 3.1));
          work.dummy.position.lerpVectors(SENDA.desde, SENDA.hasta, along).add(work.point);
          // Each blinks in its own time and fades at both ends of the way.
          work.dummy.scale.setScalar(Math.max(0, Math.sin(t * 2.2 + i * 1.9)) * Math.min(1, along * 6, (1 - along) * 6));
          work.dummy.updateMatrix();
          flies.setMatrixAt(i, work.dummy.matrix);
        }
        flies.instanceMatrix.needsUpdate = true;
      }
    }

    // The camera, after the player's controls have placed it; it glides between the views and back to the player.
    const vista = entrega && entrega.fase !== 'camino' ? VISTAS.entrega : auxilio ? (auxilio.fase === 'despega' || despertando ? VISTAS.despertar : VISTAS.auxilio) : null;
    weight.current = MathUtils.damp(weight.current, vista ? 1 : 0, GLIDE, dt);
    if (weight.current < 0.002) {
      weight.current = 0;
      seen.current.staged = false;
      return;
    }
    if (vista) {
      if (!seen.current.staged) {
        seen.current.staged = true;
        work.at.copy(vista.position);
        work.look.copy(vista.lookAt);
      } else {
        deslizar(work.at, vista.position, dt);
        deslizar(work.look, vista.lookAt, dt);
      }
    }
    const w = MathUtils.smoothstep(weight.current, 0, 1);
    camera.position.lerp(work.at, w);
    camera.quaternion.slerp(work.facing.setFromRotationMatrix(work.matrix.lookAt(camera.position, work.look, UP)), w);
    camera.updateMatrixWorld();
  });

  return (
    <>
      <primitive object={amuleto} />
      <instancedMesh ref={motas} args={[undefined, undefined, MOTAS]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color="#d9f6ff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={luciernagas} args={[undefined, undefined, LUCIERNAGAS]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#f4ff9a" toneMapped={false} />
      </instancedMesh>
      <pointLight ref={luz} position={[HADA_PEDESTAL[0], HADA_PEDESTAL[1] + LUZ.alto, HADA_PEDESTAL[2]]} color={LUZ.color} intensity={0} distance={LUZ.alcance} decay={2} />
    </>
  );
}
