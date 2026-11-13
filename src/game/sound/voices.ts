import type { AvatarGender } from '@/store/authStore';

// Which recorded voices go with each on-screen notice (ids of docs/sonido/guion_voces.csv). A notice is recognized by
// how its text begins, so the rest of the sentence can carry numbers that change. '@si' and '@no' are the player's own
// answer to an offer of help ("¡Sí, ayúdame!" / "No, gracias."), said with the voice of the player's gender, before the
// character replies.
const TOAST_VOICES: readonly (readonly [startsWith: string, clips: readonly string[]])[] = [
  ['Cruza el portón de la Villa de Boj', ['00_narrador_02']],
  ['Aldeana: «Ve a la casa de Imeri', ['@si', '01_aldeana_04']],
  ['Aldeana: «Como quieras', ['@no', '01_aldeana_05']],
  ['Imeri: «Pasa', ['@si', '01_imeri_03']],
  ['Imeri: «Como prefieras', ['@no', '01_imeri_04']],
  ['Elfo: «Abrí mi casa', ['@si', '02_elfo_04']],
  ['Elfo: «Mi casa seguirá cerrada', ['@no', '02_elfo_05']],
  ['Tienes hambre', ['02_narrador_03']],
  ['¡Te mueres de hambre!', ['02_narrador_04']],
  ['Ya superaste el Bosque de la Oscuridad', ['02_narrador_05']],
  ['¡Esa fruta estaba envenenada! El veneno', ['02_narrador_06']],
  ['¡Esa fruta estaba envenenada!', ['02_narrador_07']],
  ['¡Deliciosa! Saciaste tu hambre', ['02_narrador_08']],
  ['¡Deliciosa!', ['02_narrador_09']],
  ['Entre los árboles parpadea una lucecita', ['02_narrador_10']],
  ['Las zarzas son duras como el hierro', ['02_narrador_11']],
  ['Llegaste al pueblo minero de Hedrig', ['03_narrador_01']],
  ['Hedrig: «Ya abrí mi casa', ['@si', '03_hedrig_03']],
  ['Hedrig: «Mi puerta seguirá cerrada', ['@no', '03_hedrig_04']],
  ['El espectro de la niña te alcanza', ['03_narrador_04', '03_nina_01', '03_narrador_05']],
  ['La muñeca se llama Simona', ['03_narrador_06']],
  ['Ante la muñeca el espectro', ['03_nina_02', '03_narrador_07']],
  ['El ogro ya te dejó pasar', ['03_narrador_09']],
  ['El guante de minero es para el pulso', ['03_narrador_10']],
];

export function voicesForToast(message: string, playerGender: AvatarGender | undefined): readonly string[] | null {
  const clips = TOAST_VOICES.find(([start]) => message.startsWith(start))?.[1];
  if (!clips) return null;
  const player = playerGender === 'female' ? 'jugadora' : 'jugador';
  return clips.map((clip) => (clip.startsWith('@') ? `00_${player}_${clip.slice(1)}` : clip));
}
