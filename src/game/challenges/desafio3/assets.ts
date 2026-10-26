import { MAP_DIR } from '@/game/world/assets';

const DIR = `${MAP_DIR}/Desafio3`;

// Every file Challenge 3 loads, following the "Desafio3" collection of Map.blend.
export const DESAFIO3_MODELS = {
  tunelesCumbre: {
    estructura: `${DIR}/TunelesCumbre/TunelesEstructura.glb`,
    objetos: `${DIR}/TunelesCumbre/TunelesObjetos.glb`,
  },
  casaDeHedrig: {
    exterior: `${DIR}/CasaDeHedrig/HedrigExterior.glb`,
    interior: `${DIR}/CasaDeHedrig/HedrigInterior.glb`,
    recogibles: `${DIR}/CasaDeHedrig/HedrigRecogibles`,
  },
  puebloMinero: `${DIR}/PuebloMinero.glb`,
} as const;
