import { useState } from 'react';
import { useOnboardingRedirect } from '@/app/onboarding';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { StudentRegistrationModal } from '@/components/modals/StudentRegistrationModal';
import { isPopupDismissed, saveRegistration, signInWithGoogle, signOutUser, type RegistrationData } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';

// Sign in with Google and, the first time, the student registration (with the Ley 1581 consent). Once registered the
// onboarding redirect takes the player to the character selection or straight to the world.
export function LoginPage() {
  const step = useOnboardingRedirect('/login');
  const user = useAuthStore((state) => state.user);
  const [signingIn, setSigningIn] = useState(false);
  const [saving, setSaving] = useState(false);

  const signIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      if (!isPopupDismissed(error)) {
        console.error('Could not sign in with Google:', error);
        alert('Hubo un error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const register = async (data: RegistrationData) => {
    if (!user) return;
    setSaving(true);
    try {
      useAuthStore.getState().updateUser(await saveRegistration(user.uid, data));
    } catch (error) {
      console.error('Could not save the student registration:', error);
      alert('Hubo un error al guardar tu registro estudiantil. Por favor inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <LoginLayout accessType="student" onSignIn={signIn} loading={signingIn} />
      <StudentRegistrationModal
        isOpen={step === 'registro'}
        user={user}
        onSubmit={register}
        onCancel={() => signOutUser().catch((error) => console.error('Could not sign out:', error))}
        isSubmitting={saving}
      />
    </>
  );
}
