import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, type UserData } from '@/store/authStore';

// Steps before playing: sign in → register (student data + Ley 1581 consent) → choose a character → play.
type OnboardingStep = 'login' | 'registro' | 'personaje' | 'mundo';

function onboardingStep(user: UserData | null): OnboardingStep {
  if (!user) return 'login';
  if (!user.acceptedLaw1581 || !user.codigoEstudiantil) return 'registro';
  if (!user.nickname || !user.avatarName) return 'personaje';
  return 'mundo';
}

const PATH: Record<OnboardingStep, string> = {
  login: '/login',
  registro: '/login',
  personaje: '/seleccion-personaje',
  mundo: '/mundo',
};

// Sends the player to the page of their current step when they are on another one. Returns the step.
export function useOnboardingRedirect(currentPath: string): OnboardingStep {
  const user = useAuthStore((state) => state.user);
  const step = onboardingStep(user);
  const navigate = useNavigate();
  useEffect(() => {
    if (PATH[step] !== currentPath) navigate(PATH[step], { replace: true });
  }, [step, currentPath, navigate]);
  return step;
}
