import { create } from 'zustand';

export type AvatarGender = 'male' | 'female';

// UID reserved for local dev/agent test sessions (?dev=...); services never read or write it in Firestore.
export const DEV_USER_UID = 'dev-local-tester';
export const isDevUser = (uid: string | undefined): boolean => import.meta.env.DEV && uid === DEV_USER_UID;

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
  // Characters (glbName) lost to a third "bajo": they can never be chosen again.
  lostCharacters?: string[];
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
