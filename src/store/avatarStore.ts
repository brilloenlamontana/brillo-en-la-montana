import { create } from 'zustand';
import * as THREE from 'three';

export type AvatarGender = 'male' | 'female';
export type AvatarAction = 'Idle' | 'Walking' | 'Running' | 'Jumping' | 'Defeat';

interface AvatarState {
  avatarName: string;
  gender: AvatarGender;
  action: AvatarAction;
  nickname: string;
  hasSelectedCharacter: boolean;
  health: number;
  maxHealth: number;
  playerPosition: THREE.Vector3;
  setAvatar: (name: string, gender: AvatarGender) => void;
  setAction: (action: AvatarAction) => void;
  setPlayerPosition: (position: THREE.Vector3) => void;
  takeDamage: (amount: number) => void;
  restoreHealth: () => void;
  completeSetup: (nickname: string, avatarName: string, gender: AvatarGender) => void;
  resetAvatar: () => void;
}

export const useAvatarStore = create<AvatarState>((set) => ({
  avatarName: 'Elfa',
  gender: 'female',
  action: 'Idle',
  nickname: '',
  hasSelectedCharacter: false,
  health: 100,
  maxHealth: 100,
  playerPosition: new THREE.Vector3(0, 0, 0),
  setAvatar: (name, gender) => set({ avatarName: name, gender }),
  setAction: (action) => set({ action }),
  setPlayerPosition: (position) => set({ playerPosition: position }),
  takeDamage: (_amount) => set((state) => {
    // We can ignore the specific 'amount' to ensure 3 hits always kill
    const newHealth = Math.max(0, state.health - 34); 
    if (newHealth === 0 && state.health > 0) {
      return { health: newHealth, action: 'Defeat' }; 
    }
    return { health: newHealth };
  }),
  restoreHealth: () => set((state) => ({ health: state.maxHealth })),
  completeSetup: (nickname, avatarName, gender) => set({ nickname, avatarName, gender, hasSelectedCharacter: true, health: 100 }),
  resetAvatar: () => set({
    avatarName: 'Elfa',
    gender: 'female',
    action: 'Idle',
    nickname: '',
    hasSelectedCharacter: false,
    health: 100,
    playerPosition: new THREE.Vector3(0, 0, 0),
  }),
}));
