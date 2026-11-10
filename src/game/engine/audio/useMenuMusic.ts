import { useEffect } from 'react';
import { setAmbience, setMusic } from './audio';

// The main theme, for the pages outside the world (login, choosing a character). It starts with the first key or tap
// and keeps playing into the world's loading screen.
export function useMenuMusic() {
  useEffect(() => {
    setMusic('mus_menu');
    setAmbience(null);
  }, []);
}

// Pages that are not part of the game (the admin dashboard) are silent.
export function useNoMusic() {
  useEffect(() => {
    setMusic(null);
    setAmbience(null);
  }, []);
}
