import { useEffect } from 'react';
import { setAmbience, setMusic } from './audio';

// The main theme, for the pages outside the world (login, choosing a character). It starts with the first key or tap
// and keeps playing into the world's loading screen (on a first visit the introduction video silences it in between).
export function useMenuMusic() {
  useEffect(() => {
    setMusic('mus_menu');
    setAmbience(null);
  }, []);
}

// Silence: pages that are not part of the game (the admin dashboard) and the introduction video, which has its own sound.
export function useNoMusic() {
  useEffect(() => {
    setMusic(null);
    setAmbience(null);
  }, []);
}
