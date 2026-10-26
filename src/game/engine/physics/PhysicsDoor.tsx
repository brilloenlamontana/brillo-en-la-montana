import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Box3, Euler, MathUtils, Matrix4, Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import { restPose } from '@/game/engine/models/sceneUtils';
import { usePlayerStore } from '@/game/player/playerStore';

const UP = new Vector3(0, 1, 0);
// The leaf starts turning when the avatar gets this close to it (capsule radius 0.3 + a margin), so the avatar pushes
// it before touching it and never gets stuck on its edge.
const PUSH_RADIUS = 0.5;

type DoorPose = { hinge: Vector3; targetPosition: Vector3; targetQuaternion: Quaternion };

// Rotates what is drawn around the hinge, starting from the closed pose.
function placeLeaf(target: Object3D, { hinge, targetPosition, targetQuaternion }: DoorPose, rotation: Quaternion) {
  target.position.copy(targetPosition).sub(hinge).applyQuaternion(rotation).add(hinge);
  target.quaternion.copy(targetQuaternion).premultiply(rotation);
  target.updateMatrix();
  target.updateMatrixWorld(true);
}

// Angle in (-π, π].
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

type PhysicsDoorProps = {
  // Leaf node as it comes from the GLB; its bounding box sizes the collider.
  node: Object3D;
  // What is drawn and rotated (the node itself by default).
  target?: Object3D;
  // Hinge in world coordinates; the node origin by default (how Map.blend exports leaves).
  hinge?: Vector3;
  // Y rotation (rad) around the hinge from the GLB pose to the closed door: 0 when it is exported closed.
  closedTurn?: number;
  // Locked: the leaf stays closed and blocks the way.
  locked?: boolean;
  // How far it swings to either side.
  openAngle?: number;
};

// A door leaf the avatar opens by walking into it. The leaf is a kinematic body: contacts with the frame or the walls
// never move it, so it stays exactly where it was left (closed until someone pushes it). Each frame, if the avatar is
// within reach of the leaf, the leaf turns just enough to clear it, away from the avatar and in either direction, so
// the way out is never blocked. Locked doors ignore the avatar and stay closed.
export function PhysicsDoor({ node, target = node, hinge: hingeProp, closedTurn = 0, locked = false, openAngle = MathUtils.degToRad(100) }: PhysicsDoorProps) {
  const body = useRef<RapierRigidBody>(null);

  const door = useMemo(() => {
    // Always start from the GLB rest pose, even if the leaf was turned before (remount).
    const rest = restPose(target);
    target.position.copy(rest.position);
    target.quaternion.copy(rest.quaternion);
    target.updateMatrix();
    node.updateWorldMatrix(true, true);
    const nodePosition = new Vector3();
    const nodeQuaternion = new Quaternion();
    node.matrixWorld.decompose(nodePosition, nodeQuaternion, new Vector3());
    // Leaf box in node space (aligned with the leaf, not with the world axes).
    const toNode = new Matrix4().copy(node.matrixWorld).invert();
    const box = new Box3();
    node.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(new Matrix4().multiplyMatrices(toNode, mesh.matrixWorld)));
    });
    const half = box.getSize(new Vector3()).multiplyScalar(0.5);
    const centerWorld = box.getCenter(new Vector3()).applyMatrix4(node.matrixWorld);

    // Closed pose (Imeri's house exports its door open).
    const hinge = (hingeProp ?? nodePosition).clone().setY(centerWorld.y);
    const close = new Quaternion().setFromAxisAngle(UP, closedTurn);
    const closedCenter = centerWorld.clone().sub(hinge).applyQuaternion(close).add(hinge);
    const closedQuaternion = nodeQuaternion.clone().premultiply(close);

    // The leaf seen from above: a segment from the hinge along `direction`, as long as its farthest corner.
    const direction = new Vector3(closedCenter.x - hinge.x, 0, closedCenter.z - hinge.z).normalize();
    const toWorld = new Matrix4().makeTranslation(-hinge.x, -hinge.y, -hinge.z).premultiply(new Matrix4().makeRotationFromQuaternion(close)).multiply(node.matrixWorld);
    let length = 0;
    for (const x of [box.min.x, box.max.x]) {
      for (const z of [box.min.z, box.max.z]) {
        const corner = new Vector3(x, 0, z).applyMatrix4(toWorld);
        length = Math.max(length, Math.hypot(corner.x, corner.z));
      }
    }

    return {
      hinge,
      // Stable array: a new one per render would make Rapier reposition the body.
      hingeArray: hinge.toArray() as [number, number, number],
      targetPosition: target.position.clone().sub(hinge).applyQuaternion(close).add(hinge),
      targetQuaternion: target.quaternion.clone().premultiply(close),
      direction,
      length,
      bottom: centerWorld.y - half.y,
      top: centerWorld.y + half.y,
      colliderPosition: closedCenter.clone().sub(hinge).toArray(),
      colliderRotation: new Euler().setFromQuaternion(closedQuaternion).toArray().slice(0, 3) as [number, number, number],
      halfExtents: [Math.max(half.x, 0.05), Math.max(half.y, 0.05), Math.max(half.z, 0.05)] as [number, number, number],
    };
  }, [node, target, hingeProp, closedTurn]);

  // Current angle of the leaf (0 = closed) and the one last applied to the body and the drawing.
  const swing = useRef({ angle: 0, applied: 0, rotation: new Quaternion() });

  // Drawn closed before the first frame.
  useLayoutEffect(() => {
    const state = swing.current;
    state.angle = 0;
    state.applied = 0;
    state.rotation.identity();
    placeLeaf(target, door, state.rotation);
  }, [target, door]);

  useFrame(() => {
    const rigidBody = body.current;
    if (!rigidBody) return;
    const state = swing.current;

    if (locked) {
      state.angle = 0;
    } else {
      const { x, y, z } = usePlayerStore.getState().position;
      const px = x - door.hinge.x;
      const pz = z - door.hinge.z;
      const distance = Math.hypot(px, pz);
      // The avatar's feet between just under the leaf's bottom and its top, and within the swing of the leaf.
      if (y > door.bottom - 0.6 && y < door.top && distance > PUSH_RADIUS && distance < door.length + PUSH_RADIUS) {
        // Angle of the avatar around the hinge, measured like the leaf (0 = closed, same sense as a Y rotation).
        const { x: dx, z: dz } = door.direction;
        const playerAngle = Math.atan2(dz * px - dx * pz, dx * px + dz * pz);
        const reach = Math.asin(PUSH_RADIUS / distance);
        const offset = wrap(state.angle - playerAngle);
        if (Math.abs(offset) < reach) {
          const pushed = offset <= 0 ? playerAngle - reach : playerAngle + reach;
          state.angle = MathUtils.clamp(wrap(pushed), -openAngle, openAngle);
        }
      }
    }

    if (state.angle === state.applied) return;
    state.applied = state.angle;
    state.rotation.setFromAxisAngle(UP, state.angle);
    rigidBody.setNextKinematicRotation(state.rotation);
    placeLeaf(target, door, state.rotation);
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={door.hingeArray}>
      <CuboidCollider args={door.halfExtents} position={door.colliderPosition} rotation={door.colliderRotation} />
    </RigidBody>
  );
}
