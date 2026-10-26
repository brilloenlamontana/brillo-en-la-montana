import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { getMissionSummary } from '@/game/challenges/desafio1/mission';
import { getDesafio2Summary } from '@/game/challenges/desafio2/mission';
import type { UserData } from '@/store/authStore';
import { normalizeProgress, STARS_PER_CHALLENGE, type GameProgress } from '@/store/progressStore';
import { db } from './firebase';
import { signInWithGoogle, signOutUser } from './userService';

// Admin dashboard data. NOTE: these checks only shape the interface; any signed-in browser can call Firestore, so the
// security rules must allow reading every user and writing roles only to admins.

export interface AdminUserRecord {
  uid: string;
  name?: string;
  nombresApellidos?: string;
  email: string;
  photoURL?: string;
  codigoEstudiantil?: string;
  sedeCodigo?: string;
  sedeNombre?: string;
  facultadCodigo?: string;
  facultadNombre?: string;
  programaCodigo?: string;
  programaNombre?: string;
  acceptedLaw1581?: boolean;
  acceptedLaw1581Date?: string;
  isRegistrationComplete?: boolean;
  nickname?: string;
  avatarName?: string;
  gender?: string;
  role: 'admin' | 'student';
  progress: GameProgress;
  // Last time the player progressed in the game (written by saveProgress).
  progressUpdatedAt?: string;
}

const INSTITUTIONAL_DOMAIN = '@correounivalle.edu.co';

// Accounts listed in VITE_ADMIN_EMAILS (comma separated) are admins from their first sign-in.
const configuredAdminEmails = (): string[] =>
  String(import.meta.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const isConfiguredAdmin = (email: string) => configuredAdminEmails().includes(email.trim().toLowerCase());

const userRef = (uid: string) => doc(db, 'users', uid);

const grantAdminRole = (uid: string, extra: Partial<UserData> = {}) =>
  setDoc(userRef(uid), { ...extra, role: 'admin', isAdmin: true }, { merge: true });

// Role as stored now (not the one cached in the session): it may have been granted a moment ago.
export async function isAdminAccount(user: UserData): Promise<boolean> {
  if (isConfiguredAdmin(user.email)) return true;
  const data = (await getDoc(userRef(user.uid))).data();
  return data?.role === 'admin' || data?.isAdmin === true;
}

// Whether any admin exists yet (otherwise the first institutional account may claim the role).
export async function hasAnyAdmin(): Promise<boolean> {
  const users = collection(db, 'users');
  try {
    const [byRole, byFlag] = await Promise.all([
      getDocs(query(users, where('role', '==', 'admin'), limit(1))),
      getDocs(query(users, where('isAdmin', '==', true), limit(1))),
    ]);
    return !byRole.empty || !byFlag.empty;
  } catch {
    return false;
  }
}

// Signs in to the dashboard with Google. Only institutional accounts (or configured admins) stay signed in;
// configured admins get the role written on their profile.
export async function signInAsAdmin(): Promise<{ rejectedEmail?: string }> {
  const { user } = await signInWithGoogle();
  const email = (user.email ?? '').toLowerCase().trim();
  const configured = isConfiguredAdmin(email);
  if (!email.endsWith(INSTITUTIONAL_DOMAIN) && !configured) {
    await signOutUser();
    return { rejectedEmail: email };
  }
  if (configured) await grantAdminRole(user.uid);
  return {};
}

export const claimFirstAdmin = (user: UserData) => grantAdminRole(user.uid, { email: user.email, name: user.name });

const toRecord = (snapshot: QueryDocumentSnapshot): AdminUserRecord => {
  const data = snapshot.data();
  return {
    ...data,
    uid: snapshot.id,
    email: data.email || '',
    // Same defaults as in the game, so a player without progress shows as "pending".
    progress: normalizeProgress(data.progress),
    role: data.role === 'admin' || data.isAdmin ? 'admin' : 'student',
  };
};

const byName = (a: AdminUserRecord, b: AdminUserRecord) =>
  (a.nombresApellidos || a.name || a.email).toLowerCase().localeCompare((b.nombresApellidos || b.name || b.email).toLowerCase());

// Follows the users collection live: the dashboard updates whenever a player advances. Returns the unsubscribe.
export const subscribeToUsers = (onChange: (users: AdminUserRecord[]) => void, onError: (error: Error) => void): (() => void) =>
  onSnapshot(
    collection(db, 'users'),
    (snapshot) => onChange(snapshot.docs.map(toRecord).sort(byName)),
    (error) => {
      console.error('Could not follow the users collection:', error);
      onError(error);
    },
  );

export async function fetchAllUsers(): Promise<AdminUserRecord[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(toRecord).sort(byName);
}

/**
 * Exports the list of users and their game progress into a downloadable UTF-8 CSV.
 */
export const exportUsersToCSV = (users: AdminUserRecord[]): void => {
  if (!users || users.length === 0) {
    alert('No hay registros de usuarios para exportar.');
    return;
  }

  const headers = [
    'Código Estudiantil',
    'Nombres y Apellidos',
    'Correo Institucional',
    'Sede',
    'Facultad',
    'Programa Académico',
    'Personaje en el Juego',
    'Nombre del Personaje',
    'Misión 1 (Avance)',
    'Misión 1 (Completada)',
    'Anuncio del Alcalde (Leído)',
    'Ayuda del Aldeano',
    'Ayuda de Imeri',
    'Gema',
    'Soga',
    'Pociones',
    'Zumbadores Derrotados',
    'Golem Desactivado',
    'Estrellas',
    'Derrotas (Misión 1)',
    'Reinicios (Misión 1)',
    'Ayuda del Elfo',
    'Herramientas del Elfo',
    'Última Actividad',
    'Autorización de Datos',
    'Fecha de Autorización',
    'Tipo de Usuario',
  ];

  const escapeCSV = (val: unknown): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const missionColumns = (u: AdminUserRecord) => {
    const { steps, percent, completed } = getMissionSummary(u.progress);
    const desafio2 = getDesafio2Summary(u.progress);
    const step = (id: string) => steps.find((s) => s.id === id)!;
    const yesNo = (done: boolean) => (done ? 'Sí' : 'No');
    return [
      escapeCSV(`${percent}%`),
      escapeCSV(completed ? `Sí (${u.progress?.mision1CompletadaEn ? new Date(u.progress.mision1CompletadaEn).toLocaleString('es-CO') : 'sin fecha'})` : 'No'),
      escapeCSV(yesNo(step('carta').done)),
      escapeCSV(step('aldeano').status),
      escapeCSV(step('imeri').status),
      escapeCSV(yesNo(step('gema').done)),
      escapeCSV(yesNo(step('soga').done)),
      escapeCSV(step('insecticida').status),
      escapeCSV(step('zumbadores').status),
      escapeCSV(yesNo(step('golem').done)),
      escapeCSV(`${u.progress.estrellas} de ${STARS_PER_CHALLENGE}`),
      escapeCSV(u.progress.derrotas.desafio1 ?? 0),
      escapeCSV(u.progress.reinicios.desafio1 ?? 0),
      escapeCSV(desafio2.unlocked ? desafio2.steps[0].status : 'Bloqueada'),
      escapeCSV(`${desafio2.steps.filter((s) => s.id !== 'elfo' && s.done).length} de 3`),
      escapeCSV(u.progressUpdatedAt ? new Date(u.progressUpdatedAt).toLocaleString('es-CO') : 'Sin actividad'),
    ];
  };

  const rows = users.map((u) => [
    escapeCSV(u.codigoEstudiantil || 'Pendiente'),
    escapeCSV(u.nombresApellidos || u.name || 'Sin especificar'),
    escapeCSV(u.email),
    escapeCSV(u.sedeNombre || u.sedeCodigo || 'No especificada'),
    escapeCSV(u.facultadNombre || u.facultadCodigo || 'No especificada'),
    escapeCSV(u.programaNombre || u.programaCodigo || 'No especificado'),
    escapeCSV(u.avatarName || 'Pendiente'),
    escapeCSV(u.nickname || 'Sin alias'),
    ...missionColumns(u),
    escapeCSV(u.acceptedLaw1581 ? 'Autorizado' : 'Pendiente'),
    escapeCSV(u.acceptedLaw1581Date ? new Date(u.acceptedLaw1581Date).toLocaleString('es-CO') : 'Sin fecha'),
    escapeCSV(u.role === 'admin' ? 'Administrador' : 'Estudiante'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  // Prefix with UTF-8 BOM so Excel opens accents and special characters properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `brillo_en_la_montana_usuarios_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
