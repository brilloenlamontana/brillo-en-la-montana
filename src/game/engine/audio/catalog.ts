// The audio files of the game (public/audio), generated with ElevenLabs: see docs/sonido.

// Sound effects and how many takes of each exist (public/audio/sfx/<id>_<n>.mp3); a random take plays each time.
export const SFX = {
  d1_anillo: 1, d1_burbujas: 1, d1_estatua_fuego: 1, d1_estatua_limpiar: 1, d1_golem_apagado: 1, d1_golem_golpe: 2,
  d1_golem_nucleo: 1, d1_golem_pasos: 3, d1_golem_rugido: 2, d1_hundirse: 2, d1_soga: 1, d1_spray: 1, d1_zumbon_huye: 1,
  d1_zumbon_picadura: 2, d1_zumbon_vuelo: 1, d2_amuleto: 1, d2_duende_ataque: 3, d2_duende_muere: 2, d2_duende_risa: 3,
  d2_espada_brillo: 1, d2_espada_desenvainar: 1, d2_espada_impacto: 3, d2_espada_tajo: 3, d2_fruta_comer: 2,
  d2_claro_despierta: 1, d2_fruta_veneno: 1, d2_hada_alas: 1, d2_hada_auxilio: 1, d2_hada_libre: 1, d2_hambre: 2, d2_lente: 1, d2_lucecita: 1, d2_mapa: 1,
  d2_raices_abren: 1, d2_sendero_cambia: 2, d2_zarzas: 1, d2_zarzas_aprietan: 1, d3_brujula: 1, d3_derrumbe: 2, d3_espectro_aparece: 1, d3_espectro_llanto: 1,
  d3_frio_dano: 1, d3_guia_azul: 1, d3_muneca: 1, d3_ogro_grunido: 2, d3_ogro_lanza: 1, d3_ogro_pasos: 3, d3_ogro_risa: 1,
  d3_pulso: 1, d3_pulso_gana: 1, jug_aterrizaje: 3, jug_curacion: 1, jug_dano: 3, jug_derrota: 3, jug_pasos_hojas: 3,
  jug_pasos_lodo: 3, jug_pasos_madera: 3, jug_pasos_nieve: 4, jug_pasos_piedra: 3, jug_pasos_tierra: 3, jug_salto: 3,
  jug_vida_baja: 1, obj_brillo_recogible: 1, obj_caldero: 1, obj_carta: 1, obj_chimenea: 1, obj_fogata: 1, obj_porton: 1,
  obj_pozo_agua: 1, obj_puerta_abrir: 3, obj_puerta_bloqueada: 1, obj_puerta_cerrar: 2, rc_caliz: 1, rc_cinematica_corte: 1,
  rc_driada_pasos: 3, rc_haz_verde: 1, rc_puertas: 1, ui_aviso: 1, ui_bono: 1, ui_boton: 1, ui_carga_lista: 1,
  ui_desafio_superado: 1, ui_dialogo_abrir: 3, ui_dialogo_cerrar: 1, ui_estrella_perdida: 1, ui_item_seleccion: 1,
  ui_mochila_abrir: 3, ui_mochila_cerrar: 1, ui_no_se_puede: 1, ui_prompt: 1, ui_recoger: 3,
} as const;

export type SfxId = keyof typeof SFX;

// Background music (public/audio/musica/<id>.mp3), one loop at a time.
export type MusicId =
  | 'mus_menu'
  | 'mus_villa'
  | 'mus_hogar'
  | 'mus_pantano'
  | 'mus_bosque'
  | 'mus_combate'
  | 'mus_claro_hada'
  | 'mus_tuneles'
  | 'mus_ogro'
  | 'mus_cumbre'
  | 'mus_final';

// Ambience beds (public/audio/ambiente/<id>.mp3), one loop at a time under the music.
export type AmbienceId =
  | 'amb_villa_invierno'
  | 'amb_pantano'
  | 'amb_valle'
  | 'amb_bosque'
  | 'amb_claro_hada'
  | 'amb_pueblo_minero'
  | 'amb_tuneles'
  | 'amb_cumbre'
  | 'amb_interior_casa'
  | 'amb_santuario'
  | 'amb_recuperado';

const BASE = '/audio';

export const sfxUrl = (id: SfxId, take: number) => `${BASE}/sfx/${id}_${take}.mp3`;
export const musicUrl = (id: MusicId) => `${BASE}/musica/${id}.mp3`;
export const ambienceUrl = (id: AmbienceId) => `${BASE}/ambiente/${id}.mp3`;
// Voice clips are named <block>_<character>_<n> (docs/sonido/guion_voces.csv) and live in a folder per character.
export const voiceUrl = (clip: string) => `${BASE}/voces/${clip.split('_')[1]}/${clip}.mp3`;
