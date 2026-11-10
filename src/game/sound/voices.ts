// Which recorded voices go with each on-screen notice (ids of docs/sonido/guion_voces.csv). A notice is recognized by
// how its text begins, so the rest of the sentence can carry numbers that change.
const TOAST_VOICES: readonly (readonly [startsWith: string, clips: readonly string[]])[] = [
  ['Cruza el portón de la Villa de Boj', ['00_narrador_02']],
  ['Los aldeanos te indican el camino', ['01_narrador_01']],
  ['Decides emprender la aventura solo', ['01_narrador_02']],
  ['Imeri abrió su casa', ['01_narrador_04']],
  ['La puerta de la casa de Imeri', ['01_narrador_05']],
  ['El elfo abrió su casa', ['02_narrador_01']],
  ['La casa del elfo seguirá cerrada', ['02_narrador_02']],
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
  ['Hedrig abrió su casa', ['03_narrador_02']],
  ['La puerta de la casa de Hedrig', ['03_narrador_03']],
  ['El espectro de la niña te alcanza', ['03_narrador_04', '03_nina_01', '03_narrador_05']],
  ['La muñeca se llama Simona', ['03_narrador_06']],
  ['Ante la muñeca el espectro', ['03_nina_02', '03_narrador_07']],
  ['El ogro no deja pasar a nadie', ['03_narrador_08']],
  ['El ogro ya te dejó pasar', ['03_narrador_09']],
  ['El guante de minero es para el pulso', ['03_narrador_10']],
  ['Sin el guante de minero', ['03_narrador_11']],
  ['¡Te pones el guante de minero', ['03_narrador_12']],
  ['La dríada abre las puertas', ['04_narrador_02']],
];

export function voicesForToast(message: string): readonly string[] | null {
  return TOAST_VOICES.find(([start]) => message.startsWith(start))?.[1] ?? null;
}
