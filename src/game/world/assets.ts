// Folder of the GLBs exported from Map.blend: one subfolder per collection (Mapa, Desafio1, Desafio2...). Each
// challenge lists its own files in its assets.ts; this one holds the shared map.
export const MAP_DIR = '/models-3d/map';

export const MAPA_MODELS = {
  terreno: `${MAP_DIR}/Mapa/Terreno/Terreno.glb`,
  limiteMapa: `${MAP_DIR}/Mapa/LimitesJuego/LimiteMapa.glb`,
  pinares: `${MAP_DIR}/Mapa/Pinares.glb`,
  rocas: `${MAP_DIR}/Mapa/Rocas.glb`,
} as const;
