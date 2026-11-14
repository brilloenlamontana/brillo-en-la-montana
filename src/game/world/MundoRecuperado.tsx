import { useEffect } from 'react';
import { setTerrainColorOverride } from '@/game/engine/models/terrainTextures';
import { vegetation } from '@/game/engine/rendering/vegetation';
import { loadTerrenoRecuperado, useMundoRecuperado } from './recuperado';

// Paints the terrain and the plants green once the game is completed, and winter again if that progress goes away (another player
// signs in). Loaded without Suspense: the world keeps running while the texture arrives.
export function MundoRecuperado() {
  const recuperado = useMundoRecuperado();

  // Leaves, reeds and grass turn green with it (their shaders read this).
  useEffect(() => {
    vegetation.recovered.value = recuperado ? 1 : 0;
  }, [recuperado]);

  useEffect(() => {
    if (!recuperado) {
      setTerrainColorOverride(null);
      return;
    }
    let cancelled = false;
    loadTerrenoRecuperado()
      .then((texture) => {
        if (!cancelled) setTerrainColorOverride(texture);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [recuperado]);

  return null;
}
