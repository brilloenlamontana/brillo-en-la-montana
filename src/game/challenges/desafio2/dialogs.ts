import { holdAvatarDuring } from '@/store/uiStore';

// Dialogs of Challenge 2 (ids for uiStore.openDialog).
export const DIALOG = {
  llegada: 'desafio2.llegada',
  elfo: 'desafio2.elfo',
  bosqueSuperado: 'desafio2.bosqueSuperado',
  hada: 'desafio2.hada',
  hadaAmuleto: 'desafio2.hadaAmuleto',
} as const;

// Bonus 2: the avatar stays with the fairy while she speaks.
holdAvatarDuring(DIALOG.hada, DIALOG.hadaAmuleto);
