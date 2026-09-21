import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase.config';
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';

export const saveProgressToDB = async (uid?: string, progressKey?: string, value?: any) => {
  const targetUid = uid || useAuthStore.getState().user?.uid || auth.currentUser?.uid;
  if (!progressKey) {
    console.warn("saveProgressToDB: progressKey no válido", { targetUid, progressKey });
    return;
  }

  // Update in-memory Zustand progress store immediately
  useProgressStore.getState().setProgress({ [progressKey]: value });

  if (!targetUid) {
    console.warn("saveProgressToDB: UID no disponible aún", { targetUid, progressKey });
    return;
  }

  try {
    const userRef = doc(db, 'users', targetUid);
    // Use dot notation to update specific field in progress map
    await updateDoc(userRef, {
      [`progress.${progressKey}`]: value
    });
    console.log(`Progreso '${progressKey}' actualizado con éxito en Firestore para ${targetUid}`);
  } catch (error: any) {
    console.warn("updateDoc falló, intentando setDoc con merge:", error);
    try {
      const userRef = doc(db, 'users', targetUid);
      await setDoc(userRef, {
        progress: {
          [progressKey]: value
        }
      }, { merge: true });
      console.log(`Progreso '${progressKey}' guardado con éxito vía setDoc fallback para ${targetUid}`);
    } catch (e) {
      console.error("Error al guardar progreso en la base de datos:", e);
    }
  }
};
