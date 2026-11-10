import type { AvatarGender } from '@/store/authStore';

export interface CharacterOption {
  name: string;
  gender: AvatarGender;
  imagePath: string;
  // Name of the character's GLB in public/models-3d/avatars/<woman|man> (and the value saved as avatarName).
  glbName: string;
  // Real height of the model in metres (the camera aims at the head of each character).
  height: number;
}

export const CHARACTERS: CharacterOption[] = [
  { name: 'Draconiana', gender: 'female', imagePath: '/sprites-2d/woman/Draconiana.png', glbName: 'Draconiana', height: 1.8 },
  { name: 'Elfa', gender: 'female', imagePath: '/sprites-2d/woman/Elfa.png', glbName: 'Elfa', height: 1.74 },
  { name: 'Enana', gender: 'female', imagePath: '/sprites-2d/woman/Enana.png', glbName: 'Enana', height: 1.3 },
  { name: 'Gnoma', gender: 'female', imagePath: '/sprites-2d/woman/Gnomo.png', glbName: 'Gnoma', height: 1.0 },
  { name: 'Humana', gender: 'female', imagePath: '/sprites-2d/woman/Humana.png', glbName: 'Humana', height: 1.68 },
  { name: 'Tiflin (Mujer)', gender: 'female', imagePath: '/sprites-2d/woman/Tiflin.png', glbName: 'TiflinMujer', height: 1.68 },
  { name: 'Draconiano', gender: 'male', imagePath: '/sprites-2d/man/Draconiano.png', glbName: 'Draconiano', height: 1.9 },
  { name: 'Elfo', gender: 'male', imagePath: '/sprites-2d/man/Elfo.png', glbName: 'Elfo', height: 1.82 },
  { name: 'Enano', gender: 'male', imagePath: '/sprites-2d/man/Enano.png', glbName: 'Enano', height: 1.35 },
  { name: 'Gnomo', gender: 'male', imagePath: '/sprites-2d/man/Gnomo.png', glbName: 'Gnomo', height: 1.05 },
  { name: 'Humano', gender: 'male', imagePath: '/sprites-2d/man/Humano.png', glbName: 'Humano', height: 1.78 },
  { name: 'Tiflin (Hombre)', gender: 'male', imagePath: '/sprites-2d/man/Tiflin.png', glbName: 'TiflinHombre', height: 1.78 },
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
