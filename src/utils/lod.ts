// Margen para no saltar de un nivel a otro cuando la cámara se queda justo en la distancia de cambio.
const LEVEL_HYSTERESIS = 0.08;

// Nivel de detalle que toca a `distance` metros: distances[i] es desde dónde se usa el nivel i (distances[0] = 0).
// `current` es el nivel actual (-1 si no hay), para la histéresis.
export function pickLodLevel(distance: number, distances: readonly number[], current: number): number {
  let level = 0;
  for (let k = 1; k < distances.length; k++) if (distance >= distances[k]) level = k;
  if (current >= 0 && current !== level) {
    const boundary = distances[Math.max(level, current)];
    if (Math.abs(distance - boundary) < boundary * LEVEL_HYSTERESIS) return current;
  }
  return level;
}
