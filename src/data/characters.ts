import type { AvatarGender } from '../store/avatarStore';

export interface CharacterOption {
  name: string;
  gender: AvatarGender;
  imagePath: string;
  glbName: string;
}

export const CHARACTERS: CharacterOption[] = [
  { name: 'Draconiana', gender: 'female', imagePath: '/sprites-2d/woman/Draconiana.png', glbName: 'Draconiana' },
  { name: 'Elfa', gender: 'female', imagePath: '/sprites-2d/woman/Elfa.png', glbName: 'Elfa' },
  { name: 'Enana', gender: 'female', imagePath: '/sprites-2d/woman/Enana.png', glbName: 'Enana' },
  { name: 'Gnoma', gender: 'female', imagePath: '/sprites-2d/woman/Gnomo.png', glbName: 'Gnoma' },
  { name: 'Humana', gender: 'female', imagePath: '/sprites-2d/woman/Humana.png', glbName: 'Humana' },
  { name: 'Tiflin (Mujer)', gender: 'female', imagePath: '/sprites-2d/woman/Tiflin.png', glbName: 'TiflinMujer' },
  
  { name: 'Draconiano', gender: 'male', imagePath: '/sprites-2d/man/Draconiano.png', glbName: 'Draconiano' },
  { name: 'Elfo', gender: 'male', imagePath: '/sprites-2d/man/Elfo.png', glbName: 'Elfo' },
  { name: 'Enano', gender: 'male', imagePath: '/sprites-2d/man/Enano.png', glbName: 'Enano' },
  { name: 'Gnomo', gender: 'male', imagePath: '/sprites-2d/man/Gnomo.png', glbName: 'Gnomo' },
  { name: 'Humano', gender: 'male', imagePath: '/sprites-2d/man/Humano.png', glbName: 'Humano' },
  { name: 'Tiflin (Hombre)', gender: 'male', imagePath: '/sprites-2d/man/Tiflin.png', glbName: 'TiflinHombre' }
];
