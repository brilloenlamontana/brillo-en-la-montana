import { useEffect, useState } from 'react';
import { detectBackend, type RenderBackend } from './backend';

// What will draw the game on this device (see backend.ts), asked once before any 3D canvas mounts.
export function useRenderBackend(): RenderBackend | 'checking' {
  const [backend, setBackend] = useState<RenderBackend | 'checking'>('checking');
  useEffect(() => {
    let alive = true;
    void detectBackend().then((found) => alive && setBackend(found));
    return () => {
      alive = false;
    };
  }, []);
  return backend;
}
