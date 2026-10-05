import { create } from 'zustand';
import type { Object3D } from 'three';

// Objetos contra los que choca la cámara de tercera persona (CameraControls.colliderMeshes).
interface CameraColliderState {
  colliders: Object3D[];
  addCollider: (object: Object3D) => void;
  removeCollider: (object: Object3D) => void;
}

export const useCameraColliderStore = create<CameraColliderState>((set) => ({
  colliders: [],
  addCollider: (object) => set((state) => ({ colliders: [...state.colliders, object] })),
  removeCollider: (object) => set((state) => ({ colliders: state.colliders.filter((o) => o !== object) })),
}));
