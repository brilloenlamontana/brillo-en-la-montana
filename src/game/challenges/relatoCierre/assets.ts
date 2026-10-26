import { MAP_DIR } from '@/game/world/assets';

const DIR = `${MAP_DIR}/RelatoCierre`;

// Every file of the closing story, following the "RelatoCierre" collection of Map.blend.
export const RELATO_CIERRE_MODELS = {
  cumbreDesolacion: {
    camino: `${DIR}/CumbreDesolacion/CumbreCamino.glb`,
    columnas: `${DIR}/CumbreDesolacion/CumbreColumnas.glb`,
    edificios: `${DIR}/CumbreDesolacion/CumbreEdificios.glb`,
    jardines: `${DIR}/CumbreDesolacion/CumbreJardines.glb`,
    nieve: `${DIR}/CumbreDesolacion/CumbreNieve.glb`,
  },
  santuario: {
    exterior: `${DIR}/Santuario/SantuarioExterior.glb`,
    interior: `${DIR}/Santuario/SantuarioInterior.glb`,
    caliz: `${DIR}/Santuario/SantuarioCaliz/Caliz.glb`,
    calizBrillo: `${DIR}/Santuario/SantuarioCaliz/CalizBrillo.glb`,
  },
} as const;
