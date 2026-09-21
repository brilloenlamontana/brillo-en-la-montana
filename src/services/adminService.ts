import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import type { UserData } from '../store/authStore';

export interface AdminUserRecord {
  id: string;
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
  role?: 'admin' | 'student';
  isAdmin?: boolean;
  progress?: {
    openedMayorLetter?: boolean;
    interactedWithImeri?: boolean;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

/**
 * List of configured admin emails from environment variables (comma-separated)
 */
export const getEnvAdminEmails = (): string[] => {
  const envEmails = import.meta.env.VITE_ADMIN_EMAILS || '';
  return envEmails
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Checks if a user has admin privileges.
 * Validates Firestore role, isAdmin flag, or presence in VITE_ADMIN_EMAILS.
 */
export const checkIsAdmin = (user: UserData | null, firestoreData?: any): boolean => {
  if (!user && !firestoreData) return false;

  const email = (user?.email || firestoreData?.email || '').toLowerCase().trim();
  const role = firestoreData?.role || user?.role;
  const isAdminFlag = firestoreData?.isAdmin ?? user?.isAdmin;

  // Direct role flag check
  if (role === 'admin' || isAdminFlag === true) {
    return true;
  }

  // Environment emails fallback
  const adminEmails = getEnvAdminEmails();
  if (email && adminEmails.includes(email)) {
    return true;
  }

  return false;
};

/**
 * Fetches all registered users from Firestore 'users' collection.
 */
export const fetchAllUsers = async (): Promise<AdminUserRecord[]> => {
  try {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    const records: AdminUserRecord[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: docSnap.id,
        ...data,
        email: data.email || '',
        progress: data.progress || {},
        role: data.role || (data.isAdmin ? 'admin' : 'student'),
      } as AdminUserRecord;
    });

    // Sort by name or creation
    return records.sort((a, b) => {
      const nameA = (a.nombresApellidos || a.name || a.email).toLowerCase();
      const nameB = (b.nombresApellidos || b.name || b.email).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error('Error fetching all users for admin:', error);
    throw error;
  }
};

/**
 * Checks if there are any users with admin role in the database.
 * Useful for bootstrapping the first admin.
 */
export const checkHasAnyAdmin = async (): Promise<boolean> => {
  try {
    const users = await fetchAllUsers();
    return users.some((u) => u.role === 'admin' || u.isAdmin === true);
  } catch {
    return false;
  }
};

/**
 * Updates a user's role in Firestore.
 */
export const setUserRole = async (uid: string, role: 'admin' | 'student'): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      role,
      isAdmin: role === 'admin',
    });
  } catch (error) {
    console.error(`Error updating role for user ${uid}:`, error);
    throw error;
  }
};

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
    'Mensaje del Alcalde (Leído)',
    'Orientación Imeri (Completado)',
    'Autorización de Datos',
    'Fecha de Autorización',
    'Tipo de Usuario',
  ];

  const escapeCSV = (val: any): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
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
    escapeCSV(u.progress?.openedMayorLetter ? 'Sí' : 'No'),
    escapeCSV(u.progress?.interactedWithImeri ? 'Sí' : 'No'),
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
