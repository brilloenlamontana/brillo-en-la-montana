import type { Region } from '../utils/regions';

const from = (...regions: Region[]): ReadonlySet<Region> => new Set(regions);

// Desde qué regiones se dibuja cada parte del mundo. Lo que no se ve desde una región (tapado por las montañas o
// muy lejos) no se dibuja, así cada zona solo paga por lo que el jugador puede ver.
export const VISIBLE_FROM = {
  // En el pantano, el bosque o la colina, la villa queda detrás de las montañas.
  villaBoj: from('villa', 'camino', 'casa'),
  mayorCard: from('villa', 'camino', 'casa'),
  // Al llegar a la casa de Imeri el aldeano ya no se dibuja.
  aldeano: from('villa', 'camino'),
  casaExterior: from('villa', 'camino', 'casa', 'pantano'),
  casaInterior: from('casa'),
  imeri: from('camino', 'casa'),
  // Ni el golem ni los zumbadores se dibujan en la villa, el camino o la casa.
  enemigos: from('pantano', 'bosque', 'colina'),
  // El interior de los pozos solo se ve desde dentro del pantano; las tapas cubren los huecos del suelo.
  pozos: from('pantano'),
  tapas: from('camino', 'casa', 'pantano', 'bosque', 'colina'),
} as const;

// Hasta qué distancia de la cámara (m) se dibuja cada parte del Bosque de la Oscuridad según la región; si la región no
// aparece, no se dibuja. Desde el pantano solo asoman los primeros árboles de la entrada y lo demás aparece al acercarse.
export const BOSQUE_MAX_DISTANCE: Record<'arboles' | 'hongos' | 'manzanas', Partial<Record<Region, number>>> = {
  arboles: { pantano: 200, bosque: 100, colina: 120 },
  hongos: { pantano: 30, bosque: 100, colina: 40 },
  manzanas: { pantano: 25, bosque: 100, colina: 30 },
};
