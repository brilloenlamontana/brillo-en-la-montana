import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAvatarStore } from '../store/avatarStore';

export function useAuthGuard() {
  const { user } = useAuthStore();
  const { hasSelectedCharacter } = useAvatarStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!user.acceptedLaw1581) {
      navigate('/login');
    } else if (!hasSelectedCharacter) {
      navigate('/seleccion-personaje');
    }
  }, [user, hasSelectedCharacter, navigate]);

  return user && user.acceptedLaw1581 && hasSelectedCharacter;
}
