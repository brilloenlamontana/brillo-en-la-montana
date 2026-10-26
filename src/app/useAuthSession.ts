import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { basicProfile, fetchProfile } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';

// The one place that follows the Firebase session: on sign-in it loads the profile and the saved progress into the
// stores; on sign-out it clears them. Pages only call signInWithGoogle / signOutUser and react to the store.
export function useAuthSession() {
  useEffect(
    () =>
      onAuthStateChanged(auth, async (firebaseUser) => {
        const { setSession } = useAuthStore.getState();
        const { loadProgress, resetProgress } = useProgressStore.getState();
        if (!firebaseUser) {
          resetProgress();
          setSession(null);
          return;
        }
        try {
          const { user, progress } = await fetchProfile(firebaseUser);
          loadProgress(progress);
          setSession(user);
        } catch (error) {
          console.error('Could not read the player profile:', error);
          resetProgress();
          setSession(basicProfile(firebaseUser));
        }
      }),
    [],
  );
}
