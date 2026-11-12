// Besides the player, whoever is registered here pushes the door leaves open as they walk through (a character that
// walks by code and leads the player indoors). Each entry is the live position of its feet, mutated in place.
export const doorPushers = new Set<{ x: number; y: number; z: number }>();