import { create } from 'zustand';

export type AvatarGender = 'male' | 'female';
export type AvatarAction = 'Idle' | 'Walking' | 'Running' | 'Jumping';

interface AvatarState {
  avatarName: string;
  gender: AvatarGender;
  action: AvatarAction;
  nickname: string;
  hasSelectedCharacter: boolean;
  setAvatar: (name: string, gender: AvatarGender) => void;
  setAction: (action: AvatarAction) => void;
  completeSetup: (nickname: string, avatarName: string, gender: AvatarGender) => void;
  resetAvatar: () => void;
}

export const useAvatarStore = create<AvatarState>((set) => ({
  avatarName: 'Elfa',
  gender: 'female',
  action: 'Idle',
  nickname: '',
  hasSelectedCharacter: false,
  setAvatar: (name, gender) => set({ avatarName: name, gender }),
  setAction: (action) => set({ action }),
  completeSetup: (nickname, avatarName, gender) => set({ nickname, avatarName, gender, hasSelectedCharacter: true }),
  resetAvatar: () => set({
    avatarName: 'Elfa',
    gender: 'female',
    action: 'Idle',
    nickname: '',
    hasSelectedCharacter: false,
  }),
}));
