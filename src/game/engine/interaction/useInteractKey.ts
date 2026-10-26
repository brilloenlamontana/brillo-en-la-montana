import { useEffect } from 'react';

// Calls onPress when pressing E while `enabled` is true (holding key does not repeat).
export function useInteractKey(enabled: boolean, onPress: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.key.toLowerCase() !== 'e') return;
      onPress();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onPress]);
}
