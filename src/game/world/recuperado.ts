import { loadTerrainColorTexture } from '@/game/engine/models/terrainTextures';
import { useProgressStore } from '@/store/progressStore';
import { MAPA_MODELS } from './assets';

// The world recovers once the game is completed (the chalice is back on its altar): the cold gives way, the land is
// fertile again. From then on the map is drawn green, under a clear sky (see MundoRecuperado and Ambience).
export const useMundoRecuperado = () => useProgressStore((state) => state.progress?.juegoCompletado === true);

// The green terrain texture (tools/terreno_recuperado.py). Asking for it ahead of time avoids a wait at the end.
export const loadTerrenoRecuperado = () => loadTerrainColorTexture(MAPA_MODELS.terrenoRecuperado);
