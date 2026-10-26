import { useEffect, useState } from 'react';
import { isWebGPUAvailable } from './renderer';

type WebGPUSupport = 'checking' | 'ok' | 'unsupported';

// Asks the browser for a WebGPU adapter once, before the 3D canvas mounts.
export function useWebGPUSupport(): WebGPUSupport {
  const [support, setSupport] = useState<WebGPUSupport>('checking');
  useEffect(() => {
    let alive = true;
    isWebGPUAvailable().then((available) => alive && setSupport(available ? 'ok' : 'unsupported'));
    return () => {
      alive = false;
    };
  }, []);
  return support;
}
