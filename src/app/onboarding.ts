import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, type UserData } from '@/store/authStore';

// There is one sign-in for everybody. An administrator (see adminService: the accounts listed in VITE_ADMIN_EMAILS and
// whoever has the role on their profile) is taken to the dashboard; everybody else follows the steps before playing:
// sign in → register (student data + Ley 1581 consent) → choose a character → play.
type OnboardingStep = 'login' | 'admin' | 'registro' | 'personaje' | 'mundo';

// An administrator may also play: from the dashboard they ask for the game, and for the rest of the visit the sign-in
// page treats them as a player (they register and choose a character like anybody else).
let adminPlays = false;
export const playAsStudent = () => {
  adminPlays = true;
};

function onboardingStep(user: UserData | null, currentPath: string): OnboardingStep {
  if (!user) {
    adminPlays = false;
    return 'login';
  }
  if (user.role === 'admin' && !adminPlays && currentPath === PATH.login) return 'admin';
  if (!user.acceptedLaw1581 || !user.codigoEstudiantil) return 'registro';
  if (!user.nickname || !user.avatarName) return 'personaje';
  return 'mundo';
}

const PATH: Record<OnboardingStep, string> = {
  login: '/login',
  admin: '/admin',
  registro: '/login',
  personaje: '/seleccion-personaje',
  mundo: '/mundo',
};

// Sends the visitor to the page of their current step when they are on another one. Returns the step.
export function useOnboardingRedirect(currentPath: string): OnboardingStep {
  const user = useAuthStore((state) => state.user);
  const step = onboardingStep(user, currentPath);
  const navigate = useNavigate();
  useEffect(() => {
    if (PATH[step] !== currentPath) navigate(PATH[step], { replace: true });
  }, [step, currentPath, navigate]);
  return step;
}
