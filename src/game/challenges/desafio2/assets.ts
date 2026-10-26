import { MAP_DIR } from '@/game/world/assets';

const DIR = `${MAP_DIR}/Desafio2`;

// Every file Challenge 2 loads. Map pieces follow the "Desafio2" collection of Map.blend.
export const DESAFIO2_MODELS = {
  bosqueOscuridad: {
    arboles: `${DIR}/BosqueOscuridad/BosqueArboles.glb`,
    hongos: `${DIR}/BosqueOscuridad/BosqueHongos.glb`,
    manzanas: `${DIR}/BosqueOscuridad/BosqueManzanas.glb`,
    muroOculto: `${DIR}/BosqueOscuridad/BosqueMuroOculto.glb`,
  },
  casaDelElfo: {
    exterior: `${DIR}/CasaDelElfo/ElfoExterior.glb`,
    interior: `${DIR}/CasaDelElfo/ElfoInterior.glb`,
    arbolGigante: `${DIR}/CasaDelElfo/ArbolGigante.glb`,
    recogibles: `${DIR}/CasaDelElfo/ElfoRecogibles`,
  },
  elfo: '/models-3d/npcs/Elfo.glb',
  duende: '/models-3d/enemies/Duende.glb',
} as const;
