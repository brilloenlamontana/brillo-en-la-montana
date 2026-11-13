// Nombres en el userData de los RigidBody para reconocerlos en sensores y rayos de Rapier.
export const TERRAIN_BODY_NAME = 'terreno';
export const PLAYER_BODY_NAME = 'jugador';
// Las paredes invisibles del borde del mapa: detienen al jugador, pero la cámara las atraviesa (no se ven).
export const LIMIT_BODY_NAME = 'limite';

export function isBodyNamed(userData: unknown, name: string): boolean {
  return (userData as { name?: string } | undefined)?.name === name;
}
