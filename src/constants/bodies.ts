// Nombres en el userData de los RigidBody para reconocerlos en sensores y rayos de Rapier.
export const TERRAIN_BODY_NAME = 'terreno';
export const PLAYER_BODY_NAME = 'jugador';

export function isBodyNamed(userData: unknown, name: string): boolean {
  return (userData as { name?: string } | undefined)?.name === name;
}
