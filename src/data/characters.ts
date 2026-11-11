import type { AvatarGender } from '@/store/authStore';

export interface CharacterOption {
  name: string;
  gender: AvatarGender;
  imagePath: string;
  // Name of the character's GLB in public/models-3d/avatars/<woman|man> (and the value saved as avatarName).
  glbName: string;
  // Real height of the model in metres (the camera aims at the head of each character).
  height: number;
  // Where the face is in the sprite (pixels of its 819x1024 image): centre x, centre y and the side of the square that
  // frames it. Used for the round thumbnails (CharacterThumb).
  face: readonly [number, number, number];
}

export const CHARACTERS: CharacterOption[] = [
  { name: 'Draconiana', gender: 'female', imagePath: '/sprites-2d/woman/Draconiana.png', glbName: 'Draconiana', height: 1.8, face: [345, 156, 233] },
  { name: 'Elfa', gender: 'female', imagePath: '/sprites-2d/woman/Elfa.png', glbName: 'Elfa', height: 1.74, face: [414, 177, 220] },
  { name: 'Enana', gender: 'female', imagePath: '/sprites-2d/woman/Enana.png', glbName: 'Enana', height: 1.3, face: [393, 440, 190] },
  { name: 'Gnoma', gender: 'female', imagePath: '/sprites-2d/woman/Gnomo.png', glbName: 'Gnoma', height: 1.0, face: [411, 405, 197] },
  { name: 'Humana', gender: 'female', imagePath: '/sprites-2d/woman/Humana.png', glbName: 'Humana', height: 1.68, face: [412, 171, 235] },
  { name: 'Tiflin (Mujer)', gender: 'female', imagePath: '/sprites-2d/woman/Tiflin.png', glbName: 'TiflinMujer', height: 1.68, face: [418, 138, 252] },
  { name: 'Draconiano', gender: 'male', imagePath: '/sprites-2d/man/Draconiano.png', glbName: 'Draconiano', height: 1.9, face: [425, 175, 215] },
  { name: 'Elfo', gender: 'male', imagePath: '/sprites-2d/man/Elfo.png', glbName: 'Elfo', height: 1.82, face: [368, 247, 221] },
  { name: 'Enano', gender: 'male', imagePath: '/sprites-2d/man/Enano.png', glbName: 'Enano', height: 1.35, face: [386, 480, 180] },
  { name: 'Gnomo', gender: 'male', imagePath: '/sprites-2d/man/Gnomo.png', glbName: 'Gnomo', height: 1.05, face: [400, 430, 197] },
  { name: 'Humano', gender: 'male', imagePath: '/sprites-2d/man/Humano.png', glbName: 'Humano', height: 1.78, face: [391, 143, 253] },
  { name: 'Tiflin (Hombre)', gender: 'male', imagePath: '/sprites-2d/man/Tiflin.png', glbName: 'TiflinHombre', height: 1.78, face: [399, 160, 232] },
];

// Used when the profile has no (or an unknown) character, e.g. while the selection screen is still pending.
export const DEFAULT_CHARACTER = CHARACTERS[1];

export const findCharacter = (avatarName: string | undefined): CharacterOption =>
  CHARACTERS.find((character) => character.glbName === avatarName) ?? DEFAULT_CHARACTER;

// Folder shared by the models and the animation clips of each gender.
export const genderFolder = (gender: AvatarGender) => (gender === 'male' ? 'man' : 'woman');

export const avatarModelUrl = (avatarName: string | undefined) => {
  const character = findCharacter(avatarName);
  return `/models-3d/avatars/${genderFolder(character.gender)}/${character.glbName}.glb`;
};

// A character lost to a third "bajo" can never be chosen again. If every character has been lost, the whole cast
// becomes available once more: the player must always be able to return.
export function availableCharacters(lostCharacters: readonly string[] | undefined): CharacterOption[] {
  const lost = new Set(lostCharacters ?? []);
  const free = CHARACTERS.filter((character) => !lost.has(character.glbName));
  return free.length ? free : CHARACTERS;
}
