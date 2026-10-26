import { create } from 'zustand';

export type AvatarGender = 'male' | 'female';

// The signed-in player's profile (Firestore users/{uid}).
export interface UserData {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  acceptedLaw1581?: boolean;
  acceptedLaw1581Date?: string;
  codigoEstudiantil?: string;
  nombresApellidos?: string;
  sedeCodigo?: string;
  sedeNombre?: string;
  facultadCodigo?: string;
  facultadNombre?: string;
  programaCodigo?: string;
  programaNombre?: string;
  isRegistrationComplete?: boolean;
  // Character chosen on the selection screen.
  nickname?: string;
  avatarName?: string;
  gender?: AvatarGender;
  role?: 'admin' | 'student';
}

interface AuthState {
  user: UserData | null;
  // Firebase already answered whether there is a session (until then the app shows the loading screen).
  isAuthReady: boolean;
  setSession: (user: UserData | null) => void;
  updateUser: (changes: Partial<UserData>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthReady: false,
  setSession: (user) => set({ user, isAuthReady: true }),
  updateUser: (changes) => set((state) => (state.user ? { user: { ...state.user, ...changes } } : {})),
}));
