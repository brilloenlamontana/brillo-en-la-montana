import { useEffect } from 'react';
import { playVoice } from './audio';

// Says the clips while the component shows them: starts when it appears or when the clips change (the next step of a
// dialog) and falls silent when it goes away. `null` says nothing.
export function useVoice(clips: readonly string[] | null | undefined) {
  const key = clips?.join('|') ?? '';
  useEffect(() => {
    if (!key) return;
    return playVoice(key.split('|'));
  }, [key]);
}
