import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { db } from './firebase';

// Saves game progress: the store changes at once and Firestore (users/{uid}.progress) is written in the background, so
// the game never waits on the network. progressUpdatedAt lets the admin dashboard show each player's last activity.
export async function saveProgress(changes: Partial<GameProgress>) {
  useProgressStore.getState().setProgress(changes);

  const uid = useAuthStore.getState().user?.uid;
  if (!uid) {
    console.warn('saveProgress: no signed-in user yet', changes);
    return;
  }

  const userRef = doc(db, 'users', uid);
  const progressUpdatedAt = new Date().toISOString();
  // Dot notation updates only these fields inside the progress map.
  const fields = Object.fromEntries(Object.entries(changes).map(([key, value]) => [`progress.${key}`, value]));
  try {
    await updateDoc(userRef, { ...fields, progressUpdatedAt });
  } catch {
    // The document may not exist yet: create it.
    try {
      await setDoc(userRef, { progress: changes, progressUpdatedAt }, { merge: true });
    } catch (error) {
      console.error('Could not save the progress:', error);
    }
  }
}
