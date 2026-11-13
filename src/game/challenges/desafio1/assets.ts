import { MAP_DIR } from '@/game/world/assets';

const DIR = `${MAP_DIR}/Desafio1`;

// Every file Challenge 1 loads. Map pieces follow the "Desafio1" collection of Map.blend.
export const DESAFIO1_MODELS = {
  villaDeBoj: {
    empalizada: `${DIR}/VillaDeBoj/Empalizada.glb`,
    villa: `${DIR}/VillaDeBoj/Villa.glb`,
    porton: `${DIR}/VillaDeBoj/Porton.glb`,
    // The notice board by the gate with the mayor's announcement nailed to it.
    tablonAnuncio: `${DIR}/VillaDeBoj/TablonAnuncio.glb`,
  },
  pantanoTristeza: {
    pozos: `${DIR}/PantanoTristeza/PantanoPozos.glb`,
    tapas: `${DIR}/PantanoTristeza/PantanoTapas.glb`,
  },
  casaDeImeri: {
    exterior: `${DIR}/CasaDeImeri/ImeriExterior.glb`,
    interior: `${DIR}/CasaDeImeri/ImeriInterior.glb`,
    recogibles: `${DIR}/CasaDeImeri/ImeriRecogibles`,
  },
  // Bonus 1: the ruined hut with the statue, at the swamp exit.
  chozaEstatua: {
    exterior: `${DIR}/ChozaEstatua/ChozaExterior.glb`,
    interior: `${DIR}/ChozaEstatua/ChozaInterior.glb`,
    recogibles: `${DIR}/ChozaEstatua/ChozaRecogibles`,
  },
  aldeana: '/models-3d/npcs/Aldeana.glb',
  imeri: '/models-3d/npcs/Imeri.glb',
  golem: '/models-3d/enemies/Golem.glb',
  zumbador: '/models-3d/enemies/Zumbador.glb',
} as const;
