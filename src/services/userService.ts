import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { arrayUnion, collection, deleteField, doc, getDoc, getDocs, limit, query, setDoc, where, type DocumentData } from 'firebase/firestore';
import { CHARACTERS } from '@/data/characters';
import { findFacultadByCodigo, findProgramaByCodigo, findSedeByCodigo } from '@/data/univalle';
import { isDevUser, useAuthStore, type AvatarGender, type UserData } from '@/store/authStore';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
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
    gender: data.gender ?? CHARACTERS.find((character) => character.glbName === data.avatarName)?.gender,
    lostCharacters: Array.isArray(data.lostCharacters) ? data.lostCharacters.filter((name) => typeof name === 'string') : [],
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

export const signOutUser = () => {
  if (isDevUser(useAuthStore.getState().user?.uid)) {
    useProgressStore.getState().resetProgress();
    useAuthStore.getState().setSession(null);
    return Promise.resolve();
  }
  return signOut(auth);
};

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
  if (!isDevUser(uid)) await setDoc(userRef(uid), saved, { merge: true });
  return saved;
}

type Character = { nickname: string; avatarName: string; gender: AvatarGender };

// Nicknames are unique regardless of case, accents and spacing: "Valérius" and " valerius" are the same one. Each
// profile keeps that key (nicknameKey) next to the nickname, so it can be looked up.
export const nicknameKey = (nickname: string) =>
  nickname
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Sandbox (?dev=...): no Firestore. The other sandbox player's nickname counts as taken, to try the message.
const DEV_TAKEN = new Set(['fabian']);

// Whether another player already uses this nickname. Profiles saved before nicknameKey existed are matched by their
// exact nickname. A failed lookup is thrown: the caller does not save a nickname it could not check.
export async function isNicknameTaken(uid: string, nickname: string): Promise<boolean> {
  const key = nicknameKey(nickname);
  if (isDevUser(uid)) return DEV_TAKEN.has(key);
  const users = collection(db, 'users');
  const [byKey, byName] = await Promise.all([
    getDocs(query(users, where('nicknameKey', '==', key), limit(2))),
    getDocs(query(users, where('nickname', '==', nickname.trim()), limit(2))),
  ]);
  return [...byKey.docs, ...byName.docs].some((snapshot) => snapshot.id !== uid);
}

export const saveCharacter = (uid: string, character: Character) =>
  isDevUser(uid) ? Promise.resolve() : setDoc(userRef(uid), { ...character, nicknameKey: nicknameKey(character.nickname) }, { merge: true });

// The profile editor only changes the names: the character is chosen once and can only change by losing it.
// Only the nickname can be changed from the profile: the name comes from the institutional account.
export const saveProfile = (uid: string, profile: { nickname: string }) =>
  isDevUser(uid) ? Promise.resolve() : setDoc(userRef(uid), { ...profile, nicknameKey: nicknameKey(profile.nickname) }, { merge: true });

// The run was lost (third "bajo"): the character is forgotten and recorded as lost for good, so the onboarding asks to
// choose a different one. The registration (programme, sede...) is untouched.
export const loseCharacter = (uid: string, avatarName: string | undefined) =>
  isDevUser(uid)
    ? Promise.resolve()
    : setDoc(
        userRef(uid),
        {
          nickname: deleteField(),
          avatarName: deleteField(),
          gender: deleteField(),
          ...(avatarName ? { lostCharacters: arrayUnion(avatarName) } : {}),
        },
        { merge: true },
      );
