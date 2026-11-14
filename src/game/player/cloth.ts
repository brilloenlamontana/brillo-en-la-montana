import { Quaternion, Vector3, type Object3D } from 'three';

// Capes, skirts, coats and tails of the avatars. The shared clips only move the 65 Mixamo bones; each garment has short
// chains of bones of its own (tela_<garment>_<chain>_<n>, made on export by tools/blender/tela.py) that no clip touches.
// Here, after the animation, every chain swings as a spring pendulum: it lags behind when the avatar moves, settles
// back to how it was modelled, and is pushed out of capsules laid over the legs and arms, so feet and hands shove the
// cloth instead of going through it. The avatar file says what each garment is and how thick its limbs are
// (`tela` in the extras of its Avatar node); a file without it has no cloth and nothing runs.

type Kind = 'capa' | 'falda' | 'cola';

// How each kind of garment moves. Speeds are in metres per second for an avatar of scale 1.
//   stiffness  pull back to the modelled shape     gravity  pull straight down
//   drag       how much of its swing is lost each step (0..1)
//   sway       how much the breeze moves it         rootTurn / turn  most a chain's first / other bones leave their rest (rad)
//   thick      how far from a limb the cloth stays (m): about half the gap between two chains, so a foot cannot slip
//              between them
const KINDS: Record<Kind, { stiffness: number; gravity: number; drag: number; sway: number; rootTurn: number; turn: number; thick: number }> = {
  capa: { stiffness: 2.4, gravity: 2.6, drag: 0.32, sway: 0.35, rootTurn: 0.6, turn: 0.7, thick: 0.075 },
  falda: { stiffness: 5, gravity: 1.6, drag: 0.42, sway: 0.2, rootTurn: 0.95, turn: 1.0, thick: 0.07 },
  cola: { stiffness: 9, gravity: 0.4, drag: 0.38, sway: 0.5, rootTurn: 0.18, turn: 0.38, thick: 0.02 },
};

// The simulation advances in steps of this many seconds, whatever the frame rate (at most MAX_STEPS per frame).
const STEP = 1 / 60;
const MAX_STEPS = 3;
// Hanging cloth points at most this much upward (the y of its direction): a little under the horizontal.
const MAX_RISE = -0.2;
// A chain whose root jumps this far in one frame was teleported: it starts again at rest (m).
const TELEPORT = 1.5;

// Shins and feet kick far into the cloth, so it keeps its whole thickness away from them; thighs and arms rest against
// it all the time and only keep it a little off, or the cloth would look inflated.
const KEEP: Record<string, number> = { UpLeg: 0.5, Leg: 1, Foot: 1, Arm: 0.2, ForeArm: 0.25, Hand: 0.25 };

// The limbs the cloth is pushed out of: a capsule from one bone to the next, as thick as that limb (see `radios`).
const LIMBS: readonly (readonly [string, string, string])[] = ['Left', 'Right'].flatMap((side) => [
  [`${side}UpLeg`, `${side}Leg`, 'UpLeg'],
  [`${side}Leg`, `${side}Foot`, 'Leg'],
  [`${side}Foot`, `${side}ToeBase`, 'Foot'],
  [`${side}Arm`, `${side}ForeArm`, 'Arm'],
  [`${side}ForeArm`, `${side}Hand`, 'ForeArm'],
  [`${side}Hand`, `${side}HandMiddle1`, 'Hand'],
] as const);

// `keep` is how much of the cloth's own thickness counts against this limb.
type Capsule = { from: Object3D; to: Object3D; radius: number; keep: number; a: Vector3; b: Vector3 };
type Joint = {
  bone: Object3D;
  // How the bone sits in its parent as modelled, and how long it is (in the skeleton's units).
  rest: Quaternion;
  length: number;
  // Its tip now and one step ago (world).
  tip: Vector3;
  before: Vector3;
  root: boolean;
};
type Chain = { joints: Joint[]; kind: Kind; phase: number };

export type Cloth = { chains: Chain[]; capsules: Capsule[]; hips: Object3D | undefined; time: number; pending: number; started: boolean; anchor: Vector3 };

const UP = new Vector3(0, 1, 0);
const work = {
  parentPosition: new Vector3(),
  parentQuaternion: new Quaternion(),
  parentScale: new Vector3(),
  head: new Vector3(),
  restQuaternion: new Quaternion(),
  restDirection: new Vector3(),
  direction: new Vector3(),
  step: new Vector3(),
  turn: new Quaternion(),
  closest: new Vector3(),
  axis: new Vector3(),
  outward: new Vector3(),
  centre: new Vector3(),
  clamp: new Quaternion(),
};

// The chains of an avatar, read from its bones; null when the model has no cloth bones.
export function createCloth(scene: Object3D): Cloth | null {
  const described = scene.getObjectByName('Avatar')?.userData.tela;
  if (typeof described !== 'string') return null;
  let data: { prendas?: Record<string, Kind>; radios?: Record<string, number> };
  try {
    data = JSON.parse(described);
  } catch {
    return null;
  }

  const chains: Chain[] = [];
  scene.traverse((object) => {
    // A chain starts at a cloth bone that hangs from a bone of the body.
    if (!object.name.startsWith('tela_') || object.parent?.name.startsWith('tela_')) return;
    const garment = object.name.split('_')[1];
    const kind = data.prendas?.[garment];
    if (!kind || !KINDS[kind]) return;
    const joints: Joint[] = [];
    for (let bone: Object3D | undefined = object; bone; bone = bone.children.find((child) => child.name.startsWith('tela_'))) {
      const next = bone.children.find((child) => child.name.startsWith('tela_'));
      // The last bone has no child to say how long it is: as long as the one before.
      const length = next ? next.position.length() : (joints[joints.length - 1]?.length ?? 0.1);
      joints.push({ bone, rest: bone.quaternion.clone(), length, tip: new Vector3(), before: new Vector3(), root: joints.length === 0 });
    }
    chains.push({ joints, kind, phase: chains.length * 1.7 });
  });
  if (chains.length === 0) return null;

  const capsules: Capsule[] = [];
  for (const [from, to, limb] of LIMBS) {
    const a = scene.getObjectByName(`mixamorig${from}`);
    const b = scene.getObjectByName(`mixamorig${to}`);
    const radius = data.radios?.[limb];
    if (a && b && radius) capsules.push({ from: a, to: b, radius, keep: KEEP[limb] ?? 1, a: new Vector3(), b: new Vector3() });
  }
  return { chains, capsules, hips: scene.getObjectByName('mixamorigHips'), time: 0, pending: 0, started: false, anchor: new Vector3() };
}

// Puts every cloth bone back as it was modelled (the avatar scene is shared: whoever shows it next starts clean).
export function restCloth(cloth: Cloth) {
  for (const { joints } of cloth.chains) for (const { bone, rest } of joints) bone.quaternion.copy(rest);
  cloth.started = false;
}

// Pushes a point of the cloth out of every limb, always to the side away from the body (`centre` is on its axis): a
// leg kicking back carries the cape with it instead of coming out through it.
function keepOut(point: Vector3, capsules: readonly Capsule[], margin: number, scale: number, centre: Vector3) {
  const { axis, closest, outward } = work;
  outward.set(point.x - centre.x, 0, point.z - centre.z);
  if (outward.lengthSq() < 1e-8) return;
  outward.normalize();
  for (const { a, b, radius, keep } of capsules) {
    axis.subVectors(b, a);
    const along = Math.max(0, Math.min(1, closest.subVectors(point, a).dot(axis) / (axis.lengthSq() || 1)));
    closest.copy(a).addScaledVector(axis, along);
    const reach = radius * scale + margin * keep;
    // From the limb's axis to the point.
    closest.subVectors(point, closest);
    const distanceSq = closest.lengthSq();
    if (distanceSq >= reach * reach) continue;
    // How far outward the point has to go to be on the limb's surface.
    const lead = closest.dot(outward);
    point.addScaledVector(outward, -lead + Math.sqrt(lead * lead + reach * reach - distanceSq));
  }
}

// One frame of the cloth, to be called once the animation has posed the body. `root` is the object the avatar hangs
// from (its world matrices are brought up to date here, since the bones were just moved).
export function stepCloth(cloth: Cloth, root: Object3D, delta: number) {
  root.updateWorldMatrix(true, true);
  const { chains, capsules } = cloth;
  for (const capsule of capsules) {
    capsule.a.setFromMatrixPosition(capsule.from.matrixWorld);
    capsule.b.setFromMatrixPosition(capsule.to.matrixWorld);
  }

  // A teleport (or the first frame): the cloth starts at rest where the avatar now is.
  const anchor = work.head.setFromMatrixPosition(chains[0].joints[0].bone.parent!.matrixWorld);
  const jumped = !cloth.started || anchor.distanceTo(cloth.anchor) > TELEPORT;
  cloth.anchor.copy(anchor);
  cloth.started = true;

  cloth.pending = Math.min(cloth.pending + delta, STEP * MAX_STEPS);
  const steps = jumped ? 0 : Math.floor(cloth.pending / STEP);
  cloth.pending -= steps * STEP;
  cloth.time += delta;

  const centre = work.centre;
  if (cloth.hips) centre.setFromMatrixPosition(cloth.hips.matrixWorld);
  else centre.copy(cloth.anchor);
  const { parentPosition, parentQuaternion, parentScale, head, restQuaternion, restDirection, direction, step, turn, clamp } = work;
  for (const { joints, kind, phase } of chains) {
    const { stiffness, gravity, drag, sway, rootTurn, turn: maxTurn, thick } = KINDS[kind];
    // A slow breeze, different for each chain, so the cloth is never dead still.
    const breeze = sway * (Math.sin(cloth.time * 0.9 + phase) + 0.6 * Math.sin(cloth.time * 2.1 + phase * 2.3));
    for (const joint of joints) {
      const parent = joint.bone.parent!;
      parent.matrixWorld.decompose(parentPosition, parentQuaternion, parentScale);
      const scale = parentScale.x;
      head.copy(joint.bone.position).applyMatrix4(parent.matrixWorld);
      restQuaternion.multiplyQuaternions(parentQuaternion, joint.rest);
      restDirection.copy(UP).applyQuaternion(restQuaternion);
      const length = joint.length * scale;

      if (jumped) {
        joint.tip.copy(head).addScaledVector(restDirection, length);
        joint.before.copy(joint.tip);
      }
      for (let i = 0; i < steps; i++) {
        step.subVectors(joint.tip, joint.before).multiplyScalar(1 - drag);
        step.addScaledVector(restDirection, stiffness * STEP * scale);
        step.y -= gravity * STEP * scale;
        step.x += breeze * STEP * scale;
        step.z += breeze * 0.6 * STEP * scale;
        joint.before.copy(joint.tip);
        joint.tip.add(step);
        // It stays at its length from where it hangs, and out of the limbs.
        direction.subVectors(joint.tip, head).normalize();
        joint.tip.copy(head).addScaledVector(direction, length);
        keepOut(joint.tip, capsules, thick * scale, scale, centre);
      }
      // Every frame, not only on a step: the legs move between steps and would get into the cloth.
      direction.subVectors(joint.tip, head).normalize();
      joint.tip.copy(head).addScaledVector(direction, length);
      keepOut(joint.tip, capsules, thick * scale, scale, centre);
      direction.subVectors(joint.tip, head);
      if (direction.lengthSq() < 1e-10) direction.copy(restDirection);
      direction.normalize();
      // Hanging cloth never rises over the horizontal (a quick turn would throw the cape over the shoulders).
      if (kind !== 'cola' && direction.y > MAX_RISE) {
        direction.y = MAX_RISE;
        if (direction.x * direction.x + direction.z * direction.z < 1e-8) direction.copy(restDirection);
        direction.normalize();
      }
      // Never further from its modelled direction than its kind allows (a cape does not fold over the head).
      const limit = joint.root ? rootTurn : maxTurn;
      const angle = restDirection.angleTo(direction);
      if (angle > limit) {
        turn.setFromUnitVectors(restDirection, direction);
        direction.copy(restDirection).applyQuaternion(clamp.identity().slerp(turn, limit / angle));
      }
      joint.tip.copy(head).addScaledVector(direction, length);

      // The bone points to its tip; its children hang from where it now is.
      turn.setFromUnitVectors(restDirection, direction).multiply(restQuaternion);
      joint.bone.quaternion.copy(parentQuaternion).invert().multiply(turn);
      joint.bone.updateMatrix();
      joint.bone.matrixWorld.multiplyMatrices(parent.matrixWorld, joint.bone.matrix);
    }
  }
}
