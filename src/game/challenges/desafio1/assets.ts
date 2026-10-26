import { MAP_DIR } from '@/game/world/assets';

const DIR = `${MAP_DIR}/Desafio1`;

// Every file Challenge 1 loads. Map pieces follow the "Desafio1" collection of Map.blend.
export const DESAFIO1_MODELS = {
  villaDeBoj: {
    empalizada: `${DIR}/VillaDeBoj/Empalizada.glb`,
    villa: `${DIR}/VillaDeBoj/Villa.glb`,
    porton: `${DIR}/VillaDeBoj/Porton.glb`,
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
  cartaAlcalde: '/models-3d/objects/Card.glb',
  aldeano: '/models-3d/npcs/Aldeano.glb',
  imeri: '/models-3d/npcs/Imeri.glb',
  golem: '/models-3d/enemies/Golem.glb',
  zumbador: '/models-3d/enemies/Zumbador.glb',
} as const;

export const CARTA_ALCALDE_IMAGE = '/sprites-2d/aseets/mayor-announcement.png';
