import { useEffect } from 'react';
import { isGameplayPaused } from '@/store/uiStore';

// Calls onPress when pressing E while `enabled` is true (holding key does not repeat). Not while a narration is being
// told or a panel is open: the player walks around while listening, and must not start something else over it.
export function useInteractKey(enabled: boolean, onPress: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'e' || isGameplayPaused()) return;
      onPress();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onPress]);
}
