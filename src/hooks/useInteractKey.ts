import { useEffect } from 'react';

// Llama a onPress al presionar E mientras `enabled` sea true (mantener la tecla no repite la acción).
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
