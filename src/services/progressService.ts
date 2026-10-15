import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useProgressStore, type GameProgress } from '../store/progressStore';

// Guarda en el store al instante y en Firestore (users/{uid}.progress) en segundo plano: el juego nunca espera a la red.
// progressUpdatedAt deja ver en el administrador cuándo fue la última actividad de cada jugador.
export const saveProgressToDB = async (uid?: string, progressKey?: string, value?: any) => {
  if (!progressKey) {
    console.warn('saveProgressToDB: progressKey no válido', { progressKey });
    return;
  }
  return saveProgress({ [progressKey]: value }, uid);
};

export async function saveProgress(changes: Partial<GameProgress>, uid?: string) {
  useProgressStore.getState().setProgress(changes);

  const targetUid = uid || useAuthStore.getState().user?.uid || auth.currentUser?.uid;
  if (!targetUid) {
    console.warn('saveProgress: UID no disponible aún', changes);
    return;
  }

  const userRef = doc(db, 'users', targetUid);
  const progressUpdatedAt = new Date().toISOString();
  const fields = Object.fromEntries(Object.entries(changes).map(([key, value]) => [`progress.${key}`, value]));
  try {
    // La notación con punto actualiza solo esos campos del mapa progress.
    await updateDoc(userRef, { ...fields, progressUpdatedAt });
  } catch (error) {
    console.warn('updateDoc falló, intentando setDoc con merge:', error);
    try {
      await setDoc(userRef, { progress: changes, progressUpdatedAt }, { merge: true });
    } catch (e) {
      console.error('Error al guardar progreso en la base de datos:', e);
    }
  }
}
