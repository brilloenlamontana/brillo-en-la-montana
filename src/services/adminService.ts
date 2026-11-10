import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, setDoc, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { getMissionSummary } from '@/game/challenges/desafio1/mission';
import { getBonosSummary } from '@/game/challenges/bonos';
import { getDesafio2Summary } from '@/game/challenges/desafio2/mission';
import { getDesafio3Summary } from '@/game/challenges/desafio3/mission';
import { countDerrotas, getCierreSummary } from '@/game/challenges/relatoCierre/mission';
import { isDevUser, useAuthStore, type UserData } from '@/store/authStore';
import { normalizeProgress, STARS, useProgressStore, type GameProgress } from '@/store/progressStore';
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
  // Characters lost to a third bajo (they cannot be chosen again).
  lostCharacters?: string[];
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
  if (isDevUser(user.uid)) return user.role === 'admin';
  if (isConfiguredAdmin(user.email)) return true;
  const data = (await getDoc(userRef(user.uid))).data();
  return data?.role === 'admin' || data?.isAdmin === true;
}

// Whether any admin exists yet (otherwise the first institutional account may claim the role).
export async function hasAnyAdmin(): Promise<boolean> {
  if (isDevUser(useAuthStore.getState().user?.uid)) return true;
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

export const claimFirstAdmin = (user: UserData) =>
  isDevUser(user.uid) ? Promise.resolve() : grantAdminRole(user.uid, { email: user.email, name: user.name });

const devAdminRecords = (): AdminUserRecord[] => {
  const user = useAuthStore.getState().user;
  if (!user) return [];
  const studentProgress = useProgressStore.getState().progress;
  const student: AdminUserRecord = {
    uid: 'dev-student-danna',
    name: 'Danna Guerrero Vargas',
    nombresApellidos: 'Danna Guerrero Vargas',
    email: 'danna.guerrero@correounivalle.edu.co',
    photoURL: '/sprites-2d/woman/Elfa.png',
    codigoEstudiantil: '202427615',
    sedeCodigo: '00',
    sedeNombre: 'Cali (Meléndez)',
    facultadCodigo: '05',
    facultadNombre: 'Facultad de Ingeniería',
    programaCodigo: '3743',
    programaNombre: 'Ingeniería de Sistemas',
    acceptedLaw1581: true,
    acceptedLaw1581Date: '2026-10-12T19:10:00.000Z',
    isRegistrationComplete: true,
    nickname: 'Danna',
    avatarName: 'Elfa',
    gender: 'female',
    role: 'student',
    progress: studentProgress,
    progressUpdatedAt: '2026-10-25T21:50:00.000Z',
  };
  const admin: AdminUserRecord = {
    ...user,
    role: 'admin',
    progress: normalizeProgress(undefined),
    progressUpdatedAt: '2026-10-28T15:00:00.000Z',
  };
  return [student, admin];
};

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
export const subscribeToUsers = (onChange: (users: AdminUserRecord[]) => void, onError: (error: Error) => void): (() => void) => {
  if (isDevUser(useAuthStore.getState().user?.uid)) {
    onChange(devAdminRecords());
    return useProgressStore.subscribe(() => onChange(devAdminRecords()));
  }
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => onChange(snapshot.docs.map(toRecord).sort(byName)),
    (error) => {
      console.error('Could not follow the users collection:', error);
      onError(error);
    },
  );
};

export async function fetchAllUsers(): Promise<AdminUserRecord[]> {
  if (isDevUser(useAuthStore.getState().user?.uid)) return devAdminRecords();
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
    'Estrellas Extra (Bonos)',
    'Estrellas Extra Perdidas',
    'Derrotas Totales',
    'Personajes Perdidos',
    'Derrotas (Misión 1)',
    'Derrotas (Misión 2)',
    'Segundos Bajos',
    'Terceros Bajos',
    'Misión 2 (Avance)',
    'Misión 2 (Completada)',
    'Ayuda del Elfo',
    'Herramientas del Elfo',
    'Duendes Derrotados',
    'Frutas Buenas Comidas',
    'Sendero Oculto (Mapa)',
    'Misión 3 (Avance)',
    'Misión 3 (Completada)',
    'Ayuda de Hedrig',
    'Objetos de Hedrig',
    'Espectro Calmado (Muñeca)',
    'Ogro Vencido (Guante)',
    'Derrotas (Misión 3)',
    'Dríada Escuchada',
    'Cáliz Tomado',
    'Juego Completado',
    'Bono 1 (Anillo de Oro)',
    'Bono 2 (Amuleto del Hada)',
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
    const desafio3 = getDesafio3Summary(u.progress);
    const cierre = getCierreSummary(u.progress);
    const bonos = getBonosSummary(u.progress);
    const done3 = (id: string) => desafio3.steps.find((s) => s.id === id)?.done ?? false;
    const when = (iso: string | undefined) => (iso ? new Date(iso).toLocaleString('es-CO') : 'sin fecha');
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
      escapeCSV(`${u.progress.estrellas} de ${STARS}`),
      escapeCSV(u.progress.vidasExtra),
      escapeCSV(u.progress.vidasExtraPerdidas),
      escapeCSV(countDerrotas(u.progress)),
      escapeCSV((u.lostCharacters ?? []).join(', ') || 'Ninguno'),
      escapeCSV(u.progress.derrotas.desafio1 ?? 0),
      escapeCSV(u.progress.derrotas.desafio2 ?? 0),
      escapeCSV(u.progress.reinicios.segundoBajo ?? 0),
      escapeCSV(u.progress.reinicios.tercerBajo ?? 0),
      escapeCSV(desafio2.unlocked ? `${desafio2.percent}%` : 'Bloqueada'),
      escapeCSV(desafio2.completed ? `Sí (${u.progress?.mision2CompletadaEn ? new Date(u.progress.mision2CompletadaEn).toLocaleString('es-CO') : 'sin fecha'})` : 'No'),
      escapeCSV(desafio2.unlocked ? desafio2.steps[0].status : 'Bloqueada'),
      escapeCSV(`${desafio2.steps.filter((s) => s.id.startsWith('recoger') && s.done).length} de 3`),
      escapeCSV(desafio2.steps.find((s) => s.id === 'duendes')!.status),
      escapeCSV(desafio2.steps.find((s) => s.id === 'frutos')!.status),
      escapeCSV(yesNo(desafio2.steps.find((s) => s.id === 'mapa')?.done ?? false)),
      escapeCSV(desafio3.unlocked ? `${desafio3.percent}%` : 'Bloqueada'),
      escapeCSV(desafio3.completed ? `Sí (${when(u.progress?.mision3CompletadaEn)})` : 'No'),
      escapeCSV(desafio3.unlocked ? desafio3.steps.find((s) => s.id === 'hedrig')!.status : 'Bloqueada'),
      escapeCSV(`${desafio3.steps.filter((s) => s.id.startsWith('recoger') && s.done).length} de 3`),
      escapeCSV(yesNo(done3('espectro'))),
      escapeCSV(yesNo(done3('ogro'))),
      escapeCSV(u.progress.derrotas.desafio3 ?? 0),
      escapeCSV(yesNo(cierre.steps.find((s) => s.id === 'driada')?.done ?? false)),
      escapeCSV(yesNo(cierre.steps.find((s) => s.id === 'caliz')?.done ?? false)),
      escapeCSV(cierre.completed ? `Sí (${when(u.progress?.juegoCompletadoEn)})` : 'No'),
      escapeCSV(yesNo(bonos.steps.find((s) => s.id === 'anillo')?.done ?? false)),
      escapeCSV(yesNo(bonos.steps.find((s) => s.id === 'amuleto')?.done ?? false)),
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
