import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { withAdminRole } from '@/services/adminService';
import { basicProfile, fetchProfile } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';

// The one place that follows the Firebase session: on sign-in it loads the profile and the saved progress into the
// stores (and settles whether the account is an administrator); on sign-out it clears them. Pages only call signInWithGoogle / signOutUser and react to the store.
export function useAuthSession() {
  useEffect(() => {
    // Dev-only sandbox session (?dev=<preset>): skips Firebase Auth and Firestore completely (see devSession.ts).
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('dev')) {
      void import('./devSession').then(({ applyDevSession }) => applyDevSession());
      return;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
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
        setSession(withAdminRole(user));
      } catch (error) {
        console.error('Could not read the player profile:', error);
        resetProgress();
        setSession(withAdminRole(basicProfile(firebaseUser)));
      }
    });
  }, []);
}
