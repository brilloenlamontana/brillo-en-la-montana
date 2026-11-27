import { holdAvatarDuring } from '@/store/uiStore';

// Dialogs of Challenge 1 (ids for uiStore.openDialog).
export const DIALOG = {
  cartaAlcalde: 'desafio1.cartaAlcalde',
  imeri: 'desafio1.imeri',
  pantanoSuperado: 'desafio1.pantanoSuperado',
  aldeana: 'desafio1.aldeana',
  aldeanaAyuda: 'desafio1.aldeanaAyuda',
  estatua: 'desafio1.estatua',
} as const;

// Bonus 1: the avatar stays by the statue while its narration is told (a scene that moves it follows).
holdAvatarDuring(DIALOG.estatua);
