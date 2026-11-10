import { MAP_DIR } from '@/game/world/assets';

const DIR = `${MAP_DIR}/Desafio3`;

// Every file Challenge 3 loads. Map pieces follow the "Desafio3" collection of Map.blend.
export const DESAFIO3_MODELS = {
  tunelesCumbre: {
    estructura: `${DIR}/TunelesCumbre/TunelesEstructura.glb`,
    objetos: `${DIR}/TunelesCumbre/TunelesObjetos.glb`,
    // Collision only (never drawn): the smooth floor mesh of the galleries.
    colision: `${DIR}/TunelesCumbre/TunelesColision.glb`,
  },
  casaDeHedrig: {
    exterior: `${DIR}/CasaDeHedrig/HedrigExterior.glb`,
    interior: `${DIR}/CasaDeHedrig/HedrigInterior.glb`,
    recogibles: `${DIR}/CasaDeHedrig/HedrigRecogibles`,
  },
  puebloMinero: `${DIR}/PuebloMinero.glb`,
  hedrig: '/models-3d/npcs/Hedrig.glb',
  ninaFantasma: '/models-3d/enemies/NinaFantasma.glb',
  ninaClara: '/models-3d/npcs/NinaClara.glb',
  ogro: '/models-3d/enemies/Ogro.glb',
} as const;
