// Nombres en el userData de los RigidBody para reconocerlos en sensores y rayos de Rapier.
export const TERRAIN_BODY_NAME = 'terreno';
export const PLAYER_BODY_NAME = 'jugador';
// Las paredes invisibles del borde del mapa: detienen al jugador, pero la cámara las atraviesa (no se ven).
export const LIMIT_BODY_NAME = 'limite';

// Un techo que solo detiene a la cámara, y solo dentro de los túneles: nada choca con él (ver TunelesCumbre).
export const TUNNEL_CEILING_BODY_NAME = 'techoTunel';

export function isBodyNamed(userData: unknown, name: string): boolean {
  return (userData as { name?: string } | undefined)?.name === name;
}
