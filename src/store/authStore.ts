import { create } from 'zustand';

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
}

interface AuthState {
  user: UserData | null;
  isAuthReady: boolean;
  setUser: (user: UserData | null) => void;
  setAuthReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
}));
