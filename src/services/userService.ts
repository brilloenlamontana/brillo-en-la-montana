import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { deleteField, doc, getDoc, setDoc, type DocumentData } from 'firebase/firestore';
import { findFacultadByCodigo, findProgramaByCodigo, findSedeByCodigo } from '@/data/univalle';
import type { AvatarGender, UserData } from '@/store/authStore';
import type { GameProgress } from '@/store/progressStore';
import { auth, db, googleProvider } from './firebase';

// Player profiles in Firestore (users/{uid}). Only this module reads or writes them.
const userRef = (uid: string) => doc(db, 'users', uid);

// Older documents stored sede/facultad/programa instead of the *Codigo fields; names come from the local catalog.
function toUserData(firebaseUser: User, data: DocumentData | undefined): UserData {
  const base: UserData = {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || 'Sin nombre',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || '',
    acceptedLaw1581: false,
  };
  if (!data) return base;
  const sedeCodigo = data.sedeCodigo || data.sede;
  const facultadCodigo = data.facultadCodigo || data.facultad;
  const programaCodigo = data.programaCodigo || data.programa;
  return {
    ...base,
    acceptedLaw1581: Boolean(data.acceptedLaw1581),
    acceptedLaw1581Date: data.acceptedLaw1581Date,
    codigoEstudiantil: data.codigoEstudiantil,
    nombresApellidos: data.nombresApellidos,
    sedeCodigo,
    sedeNombre: findSedeByCodigo(sedeCodigo)?.nombre ?? data.sedeNombre ?? '',
    facultadCodigo,
    facultadNombre: findFacultadByCodigo(facultadCodigo)?.nombre ?? data.facultadNombre ?? '',
    programaCodigo,
    programaNombre: findProgramaByCodigo(programaCodigo)?.nombre ?? data.programaNombre ?? '',
    isRegistrationComplete: Boolean(data.codigoEstudiantil),
    nickname: data.nickname,
    avatarName: data.avatarName,
    gender: data.gender ?? (data.avatarName ? 'female' : undefined),
    role: data.role === 'admin' || data.isAdmin ? 'admin' : 'student',
  };
}

export async function fetchProfile(firebaseUser: User): Promise<{ user: UserData; progress?: Partial<GameProgress> }> {
  const snapshot = await getDoc(userRef(firebaseUser.uid));
  const data = snapshot.exists() ? snapshot.data() : undefined;
  return { user: toUserData(firebaseUser, data), progress: data?.progress };
}

// Profile without Firestore data (offline or failed read): the player is asked to register again.
export const basicProfile = (firebaseUser: User): UserData => toUserData(firebaseUser, undefined);

export function signInWithGoogle() {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, googleProvider);
}

export const signOutUser = () => signOut(auth);

// Closing the Google popup is not an error worth telling the player about.
export const isPopupDismissed = (error: unknown) =>
  ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes((error as { code?: string })?.code ?? '');

export type RegistrationData = Pick<
  UserData,
  'nombresApellidos' | 'email' | 'codigoEstudiantil' | 'sedeCodigo' | 'sedeNombre' | 'facultadCodigo' | 'facultadNombre' | 'programaCodigo' | 'programaNombre' | 'acceptedLaw1581Date'
>;

// Student registration with the Ley 1581 data consent. Returns the saved fields.
export async function saveRegistration(uid: string, data: RegistrationData): Promise<Partial<UserData>> {
  const saved = {
    ...data,
    acceptedLaw1581: true,
    acceptedLaw1581Date: data.acceptedLaw1581Date ?? new Date().toISOString(),
    isRegistrationComplete: true,
  };
  await setDoc(userRef(uid), saved, { merge: true });
  return saved;
}

type Character = { nickname: string; avatarName: string; gender: AvatarGender };

export const saveCharacter = (uid: string, character: Character) => setDoc(userRef(uid), character, { merge: true });

export const saveProfile = (uid: string, profile: Character & { name: string }) => setDoc(userRef(uid), profile, { merge: true });

// The run was lost (third "bajo"): the character is forgotten, so the onboarding asks to choose a new one.
export const clearCharacter = (uid: string) =>
  setDoc(userRef(uid), { nickname: deleteField(), avatarName: deleteField(), gender: deleteField() }, { merge: true });
