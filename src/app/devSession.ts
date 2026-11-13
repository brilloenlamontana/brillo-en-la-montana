import { CHARACTERS } from '@/data/characters';
import { AMULETO_HADA, ANILLO_ORO } from '@/game/challenges/bonos';
import { useCinematicaStore } from '@/game/challenges/relatoCierre/cinematica/cinematica';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore, type Spawn } from '@/game/player/playerStore';
import { PLAYER_START, RESPAWN_POINT } from '@/game/player/spawn';
import { useZoneStore } from '@/game/world/zoneStore';
import { DEV_USER_UID, useAuthStore, type UserData } from '@/store/authStore';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';

// Local sandbox session for browser automation and manual dev testing (?dev=<preset>).
// Only loaded when import.meta.env.DEV is true and `?dev` is in the URL; never touches Firebase Auth or Cloud Firestore.

const IMERI_ITEMS = ['gema', 'soga', 'pocionAmbar', 'pocionHojas', 'pocionHongos', 'pocionPequena', 'pocionRoja'];
const ELFO_ITEMS = ['espada', 'lente', 'mapa'];
const HEDRIG_ITEMS = ['guante', 'brujula', 'muneca'];

const DESAFIO1_DONE: Partial<GameProgress> = {
  collectedItems: IMERI_ITEMS,
  openedMayorLetter: true,
  aldeanoHelp: 'accepted',
  interactedWithImeri: true,
  imeriHelp: 'accepted',
  golemDefeated: true,
  zumbadoresDefeated: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  mision1Completada: true,
  mision1CompletadaEn: '2026-10-18T19:20:00.000Z',
};

const DESAFIO2_DONE: Partial<GameProgress> = {
  ...DESAFIO1_DONE,
  collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS],
  interactedWithElfo: true,
  elfoHelp: 'accepted',
  duendesDefeated: [0, 1, 2, 3, 4, 5],
  // Fixed indices where isFrutoBueno(i) is true in desafio2/mission.ts.
  frutosComidos: [1, 4, 7],
  mapaActivado: true,
  mision2Completada: true,
  mision2CompletadaEn: '2026-10-25T21:45:00.000Z',
};

const HEDRIG_HELP: Partial<GameProgress> = { llegoAlPueblo: true, interactedWithHedrig: true, hedrigHelp: 'accepted' };

const DESAFIO3_DONE: Partial<GameProgress> = {
  ...DESAFIO2_DONE,
  ...HEDRIG_HELP,
  collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ...HEDRIG_ITEMS],
  espectroCalmado: true,
  ogroVencido: true,
  mision3Completada: true,
  mision3CompletadaEn: '2026-11-08T22:10:00.000Z',
};

const TUNELES_LISTO: Partial<GameProgress> = {
  ...DESAFIO2_DONE,
  ...HEDRIG_HELP,
  collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ...HEDRIG_ITEMS],
};

const SANTUARIO_ABIERTO: Partial<GameProgress> = { ...DESAFIO3_DONE, interactedWithDriada: true };

// Bonuses, applied by the `&bonos=` modifier (see applyModifiers).
const BONO1: Partial<GameProgress> = { estatuaLimpia: true, estatuaEncendida: true, bono1Completado: true };
const BONO2: Partial<GameProgress> = { hadaLiberada: true, bono2Completado: true };

// Where the tunnels come out on the Summit of Desolation (same as relatoCierre's checkpoint; ground at 52.0).
const SALIDA_CUMBRE: Spawn = { x: 107.7, y: 53.6, z: -161.85, yaw: 1.26 };
// Spots reused by several presets.
const FRENTE_IMERI: Spawn = { x: 14.5, y: 11.8, z: 41, yaw: Math.atan2(3.5, 3) };
const PIE_ARBOL_ELFO: Spawn = { x: -36.4, y: 11.9, z: -122.5, yaw: Math.PI };
const PANTANO_ORILLA: Spawn = { x: 50, y: 12.2, z: 24, yaw: Math.PI / 2 };
const BOSQUE_ENTRADA: Spawn = { x: -25, y: 13.3, z: -182, yaw: Math.PI };
const CASA_HEDRIG: Spawn = { x: 82, y: 25.3, z: -211.6, yaw: Math.PI / 2 };
const CHOZA: Spawn = { x: -62, y: 9.9, z: -87.5, yaw: Math.PI };
// Inside the hut, facing the statue's face.
const FRENTE_ESTATUA: Spawn = { x: -61.4, y: 9.9, z: -95.6, yaw: -Math.PI / 4 };
const CLARO: Spawn = { x: 40, y: 16, z: -221.5, yaw: Math.PI };
const PLAZA_SANTUARIO: Spawn = { x: 147, y: 53.4, z: -153, yaw: Math.PI / 2 };
// Inside the sanctuary, within reach of the chalice on the altar (163.2, 53.85, -153).
const FRENTE_ALTAR: Spawn = { x: 161, y: 53.6, z: -153, yaw: Math.PI / 2 };

type DevPreset = {
  progress?: Partial<GameProgress>;
  spawn?: Spawn;
  user?: Partial<UserData>;
  // Dialog opened once the world is ready (narrations and summaries that are hard to reach by hand).
  dialog?: string;
  // Starts the final cinematic once the world is ready.
  cinematica?: boolean;
};

export const DEV_PRESETS: Record<string, DevPreset> = {
  // --- Challenge 1: Villa de Boj, Imeri's house, Swamp of Sadness & Bonus 1 ---
  // Villa Boj gate from scratch (default for ?dev=1 or ?dev).
  '1': { spawn: PLAYER_START },
  villa: { spawn: PLAYER_START },
  desafio1: { spawn: PLAYER_START },

  // A few steps from the notice board by the gate, announcement not read yet: walking up to it opens it.
  carta: { spawn: { x: -45, y: 12.2, z: 19.9, yaw: -Math.PI / 2 } },

  // By the well of the Villa de Boj square, in front of the villager woman, announcement already read: she tells what
  // happened and asks whether you need help.
  aldeana: {
    spawn: { x: -74.8, y: 12.2, z: 20.4, yaw: -Math.PI / 2 },
    progress: { openedMayorLetter: true },
  },

  // In front of the villager woman with her help already accepted: she tells the old tales (hints of the bonuses).
  aldeanaPistas: {
    spawn: { x: -74.8, y: 12.2, z: 20.4, yaw: -Math.PI / 2 },
    progress: { openedMayorLetter: true, aldeanoHelp: 'accepted' },
  },

  // In front of Imeri with the villager woman's help accepted, ready to talk to her and accept her help.
  imeriHablar: {
    spawn: FRENTE_IMERI,
    progress: { openedMayorLetter: true, aldeanoHelp: 'accepted' },
  },

  // In front of Imeri's house, door unlocked and backpack active (ready to go inside and pick up the 7 items).
  imeri: {
    spawn: FRENTE_IMERI,
    progress: {
      openedMayorLetter: true,
      aldeanoHelp: 'accepted',
      interactedWithImeri: true,
      imeriHelp: 'accepted',
    },
  },

  // Dry shore before the Swamp of Sadness with gem, rope and insecticide (5 potions) ready.
  pantano: {
    spawn: PANTANO_ORILLA,
    progress: {
      collectedItems: IMERI_ITEMS,
      openedMayorLetter: true,
      aldeanoHelp: 'accepted',
      interactedWithImeri: true,
      imeriHelp: 'accepted',
    },
  },

  // Swamp almost cleared (Golem off + 9/10 zumbadores defeated): defeat 1 more zumbador to trigger Challenge 1 victory.
  pantanoCasi: {
    spawn: PANTANO_ORILLA,
    progress: {
      collectedItems: IMERI_ITEMS,
      openedMayorLetter: true,
      aldeanoHelp: 'accepted',
      interactedWithImeri: true,
      imeriHelp: 'accepted',
      golemDefeated: true,
      zumbadoresDefeated: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    },
  },

  // Swamp of Sadness completed narration & parchment dialog open.
  pantanoSuperado: {
    spawn: PIE_ARBOL_ELFO,
    progress: DESAFIO1_DONE,
    dialog: 'desafio1.pantanoSuperado',
  },

  // Bonus 1 (stage 1) — Next to the ruined hut of the moss-covered statue at the swamp exit.
  choza: {
    spawn: CHOZA,
    progress: DESAFIO1_DONE,
  },

  // Bonus 1 (stage 1) — In front of the statue, its face still under the moss: E starts cleaning it by hand.
  chozaEstatua: {
    spawn: FRENTE_ESTATUA,
    progress: DESAFIO1_DONE,
  },

  // Bonus 1 (stage 2) — Statue's face already cleaned of moss, ready to light the fire in the stone dish.
  chozaLimpia: {
    spawn: FRENTE_ESTATUA,
    progress: { ...DESAFIO1_DONE, estatuaLimpia: true },
    dialog: 'desafio1.estatua',
  },

  // Bonus 1 (stage 3) — Fire lit at the statue's feet, ready to claim the gold ring and the 1st extra star.
  chozaEncendida: {
    spawn: FRENTE_ESTATUA,
    progress: { ...DESAFIO1_DONE, estatuaLimpia: true, estatuaEncendida: true },
    dialog: 'desafio1.estatua',
  },

  // Bonus 1 completed — Gold ring in backpack and +1 extra star (3 stars + 1 bonus star).
  bono1: {
    spawn: CHOZA,
    progress: {
      ...DESAFIO1_DONE,
      ...BONO1,
      collectedItems: [...IMERI_ITEMS, ANILLO_ORO],
      vidasExtra: 1,
    },
    dialog: 'desafio1.estatua',
  },

  // --- Challenge 2: Elf's treehouse, Dark Forest & Bonus 2 ---
  // At the foot of the giant tree by the Elf, right after Challenge 1.
  desafio2: { spawn: PIE_ARBOL_ELFO, progress: DESAFIO1_DONE },
  elfo: { spawn: PIE_ARBOL_ELFO, progress: DESAFIO1_DONE },

  // Elf's help accepted and treehouse door unlocked (ready to climb up and collect sword, lens and map).
  elfoCasa: {
    spawn: PIE_ARBOL_ELFO,
    progress: { ...DESAFIO1_DONE, interactedWithElfo: true, elfoHelp: 'accepted' },
  },

  // Dark Forest entrance with the Elf's sword, revealing lens and forest map in the backpack.
  bosque: {
    spawn: BOSQUE_ENTRADA,
    progress: {
      ...DESAFIO1_DONE,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS],
      interactedWithElfo: true,
      elfoHelp: 'accepted',
    },
  },

  // Dark Forest with all 6 goblins defeated and 2/3 good fruits eaten (use lens [2] and eat 1 yellow fruit).
  bosqueFrutas: {
    spawn: BOSQUE_ENTRADA,
    progress: {
      ...DESAFIO1_DONE,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS],
      interactedWithElfo: true,
      elfoHelp: 'accepted',
      duendesDefeated: [0, 1, 2, 3, 4, 5],
      frutosComidos: [1, 4],
    },
  },

  // In front of the hidden rock wall with goblins defeated and hunger satisfied: press [3] (map) to lower the wall and complete Challenge 2.
  bosqueMuro: {
    spawn: { x: 11, y: 15.2, z: -193, yaw: Math.PI / 2 },
    progress: {
      ...DESAFIO1_DONE,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS],
      interactedWithElfo: true,
      elfoHelp: 'accepted',
      duendesDefeated: [0, 1, 2, 3, 4, 5],
      frutosComidos: [1, 4, 7],
    },
  },

  // Challenge 2 completed narration & parchment dialog open.
  bosqueSuperado: {
    spawn: CASA_HEDRIG,
    progress: DESAFIO2_DONE,
    dialog: 'desafio2.bosqueSuperado',
  },

  // Bonus 2 (stage 1) — At the edge of the fairy's clearing near the forest exit, with the elven sword ready to cut the brambles.
  claro: {
    spawn: CLARO,
    progress: { ...DESAFIO2_DONE },
  },

  // Bonus 2 without the elven sword — To test the warning toast when trying to cut the iron-hard brambles without the sword.
  claroSinEspada: {
    spawn: CLARO,
    progress: { ...DESAFIO1_DONE, interactedWithElfo: true, elfoHelp: 'accepted' },
  },

  // Bonus 2 (stage 2) — Fairy freed from the brambles, dialog open and amulet ready to pick up on the root lectern.
  hadaLibre: {
    spawn: { x: 40, y: 16.5, z: -227, yaw: Math.PI },
    progress: { ...DESAFIO2_DONE, hadaLiberada: true },
    dialog: 'desafio2.hada',
  },

  // Bonus 2 completed — Fairy's amulet in backpack, dialog open and +1 extra star.
  bono2: {
    spawn: { x: 40, y: 16.5, z: -227, yaw: Math.PI },
    progress: {
      ...DESAFIO2_DONE,
      ...BONO2,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, AMULETO_HADA],
      vidasExtra: 1,
    },
    dialog: 'desafio2.hadaAmuleto',
  },

  // --- Challenge 3: Hedrig's mining town, Summit Tunnels, Spectre Simona & Ogre ---
  // Entering the mining town from the forest trail (llegoAlPueblo: false) to trigger the arrival toast live.
  llegadaPueblo: {
    spawn: { x: 78, y: 24.5, z: -205, yaw: Math.PI / 2 },
    progress: DESAFIO2_DONE,
  },

  // In front of Hedrig's house in the mining town, ready to talk to Hedrig by the campfire.
  desafio3: {
    spawn: CASA_HEDRIG,
    progress: { ...DESAFIO2_DONE, llegoAlPueblo: true },
  },
  pueblo: {
    spawn: CASA_HEDRIG,
    progress: { ...DESAFIO2_DONE, llegoAlPueblo: true },
  },

  // Hedrig's help accepted and house door unlocked (ready to go inside and pick up glove, compass and doll).
  hedrigCasa: {
    spawn: CASA_HEDRIG,
    progress: { ...DESAFIO2_DONE, ...HEDRIG_HELP },
  },

  // By the mine mouth where the Summit tunnels begin, with Hedrig's 3 items (glove, compass, doll) in the backpack.
  tuneles: {
    spawn: { x: 97, y: 25.4, z: -196, yaw: 0 },
    progress: TUNELES_LISTO,
  },

  // Inside the Spectre's chamber (H1) in the tunnels, with the doll [3] ready to calm Simona.
  espectro: {
    spawn: { x: 126, y: 30.5, z: -178.5, yaw: Math.PI / 2 },
    progress: TUNELES_LISTO,
  },

  // Inside the Spectre's chamber WITHOUT the doll, to test the frost attack and warning toast when pressing [3].
  espectroSinMuneca: {
    spawn: { x: 126, y: 30.5, z: -178.5, yaw: Math.PI / 2 },
    progress: {
      ...DESAFIO2_DONE,
      ...HEDRIG_HELP,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, 'guante', 'brujula'],
    },
  },

  // Before the wooden bridge over the crevasse (H2) in the tunnels, spectre already calmed.
  puente: {
    spawn: { x: 138, y: 35.8, z: -165, yaw: 0 },
    progress: { ...TUNELES_LISTO, espectroCalmado: true },
  },

  // In the Ogre's hall at the end of the maze (H3, floor at 42.5), spectre calmed, ready to challenge the Ogre with the glove [1].
  ogro: {
    spawn: { x: 111.5, y: 44, z: -166, yaw: 2 },
    progress: { ...TUNELES_LISTO, espectroCalmado: true },
  },

  // In the Ogre's hall WITHOUT the miner's glove, to test being repelled and losing 20 HP.
  ogroSinGuante: {
    spawn: { x: 111.5, y: 44, z: -166, yaw: 2 },
    progress: {
      ...DESAFIO2_DONE,
      ...HEDRIG_HELP,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, 'brujula', 'muneca'],
      espectroCalmado: true,
    },
  },

  // Ogre defeated in arm-wrestling: narration dialog open and spiral stairs to the Summit unlocked.
  ogroVencido: {
    spawn: { x: 111.5, y: 44, z: -166, yaw: 2 },
    progress: { ...TUNELES_LISTO, espectroCalmado: true, ogroVencido: true },
    dialog: 'desafio3.ogroVencido',
  },

  // Top of the spiral stairs just before emerging onto the Summit (mision3Completada: false) to trigger the Summit arrival dialog live.
  escaleraCumbre: {
    spawn: { x: 106.75, y: 53.0, z: -164.7, yaw: 0 },
    progress: { ...TUNELES_LISTO, espectroCalmado: true, ogroVencido: true },
  },

  // --- Closing story: Summit of Desolation, Sanctuary, Dryad, Chalice, Final Cinematic & Victory ---
  // Tunnel exit on the Summit of Desolation plateau, Challenge 3 completed.
  cumbre: { spawn: SALIDA_CUMBRE, progress: DESAFIO3_DONE },
  relatoCierre: { spawn: SALIDA_CUMBRE, progress: DESAFIO3_DONE },

  // Summit arrival narration & parchment dialog open.
  cumbreDialogo: {
    spawn: SALIDA_CUMBRE,
    progress: DESAFIO3_DONE,
    dialog: 'desafio3.cumbre',
  },

  // On the plaza in front of the sanctuary door, where the Dryad comes out to welcome the player.
  santuario: {
    spawn: PLAZA_SANTUARIO,
    progress: DESAFIO3_DONE,
  },

  // Dryad's welcome dialog and narration open in front of the Sanctuary.
  driadaDialogo: {
    spawn: { x: 148.5, y: 53.4, z: -150.5, yaw: Math.PI / 2 },
    progress: DESAFIO3_DONE,
    dialog: 'relatoCierre.driada',
  },

  // In front of the unlocked silver-willow double doors of the Sanctuary, ready to push them open and walk to the altar.
  santuarioAbierto: {
    spawn: { x: 150.5, y: 53.5, z: -153, yaw: Math.PI / 2 },
    progress: SANTUARIO_ABIERTO,
  },

  // Inside the Sanctuary right in front of the altar: press [E] ("tomar el cáliz") to trigger the Final Cinematic & Victory.
  altar: { spawn: FRENTE_ALTAR, progress: SANTUARIO_ABIERTO },
  caliz: { spawn: FRENTE_ALTAR, progress: SANTUARIO_ABIERTO },

  // Plays the 6-shot narrated Final Cinematic over the green recovered world, then opens the Victory summary.
  cinematica: {
    spawn: FRENTE_ALTAR,
    progress: {
      ...SANTUARIO_ABIERTO,
      ...BONO1,
      ...BONO2,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ...HEDRIG_ITEMS, ANILLO_ORO, AMULETO_HADA],
      vidasExtra: 2,
      calizTomado: true,
      juegoCompletado: true,
      juegoCompletadoEn: '2026-11-11T18:30:00.000Z',
    },
    cinematica: true,
  },

  // Final Victory parchment & narration open (3 stars + 2 bonuses completed).
  victoria: {
    spawn: FRENTE_ALTAR,
    progress: {
      ...SANTUARIO_ABIERTO,
      ...BONO1,
      ...BONO2,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ...HEDRIG_ITEMS, ANILLO_ORO, AMULETO_HADA],
      vidasExtra: 2,
      calizTomado: true,
      juegoCompletado: true,
      juegoCompletadoEn: '2026-11-11T18:30:00.000Z',
    },
    dialog: 'relatoCierre.victoria',
  },

  // Final Victory parchment without the optional bonuses (triggers the alternate ending narration 04_narrador_11).
  victoriaSinBonos: {
    spawn: FRENTE_ALTAR,
    progress: {
      ...SANTUARIO_ABIERTO,
      calizTomado: true,
      juegoCompletado: true,
      juegoCompletadoEn: '2026-11-11T18:30:00.000Z',
    },
    dialog: 'relatoCierre.victoria',
  },

  // --- Lives / Stars, Bonuses & Low Academic Performance ("Bajos") presets ---
  // 3 base lives (3 stars, 0 extra stars).
  vidas3: { spawn: PANTANO_ORILLA, progress: { ...DESAFIO1_DONE, estrellas: 3, vidasExtra: 0 } },
  // 2 base lives (2 stars left after 1st bajo).
  vidas2: {
    spawn: PANTANO_ORILLA,
    progress: { ...DESAFIO1_DONE, estrellas: 2, vidasExtra: 0, derrotas: { desafio1: 1 } },
  },
  // 1 base life (1 star left after 2nd bajo).
  vidas1: {
    spawn: PLAYER_START,
    progress: { estrellas: 1, vidasExtra: 0, derrotas: { desafio1: 2 }, reinicios: { segundoBajo: 1 } },
  },
  // 3 base lives + 1 bonus star (Bonus 1 gold ring).
  vidas3bono1: {
    spawn: BOSQUE_ENTRADA,
    progress: {
      ...DESAFIO1_DONE,
      ...BONO1,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ANILLO_ORO],
      interactedWithElfo: true,
      elfoHelp: 'accepted',
      estrellas: 3,
      vidasExtra: 1,
    },
  },
  // 3 base lives + 2 bonus stars (Bonus 1 gold ring + Bonus 2 fairy amulet).
  vidas3bonos2: {
    spawn: { x: 97, y: 25.4, z: -196, yaw: 0 },
    progress: {
      ...TUNELES_LISTO,
      ...BONO1,
      ...BONO2,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ...HEDRIG_ITEMS, ANILLO_ORO, AMULETO_HADA],
      estrellas: 3,
      vidasExtra: 2,
    },
  },

  // 1st Bajo dialog & narration open (2 stars left, stays in current challenge).
  bajo1: {
    spawn: { ...RESPAWN_POINT, yaw: 0 },
    progress: { estrellas: 2, derrotas: { desafio1: 1 } },
    dialog: 'bajo.1',
  },
  // 2nd Bajo dialog & narration open (1 star left, story restarts in Villa de Boj).
  bajo2: {
    spawn: { ...RESPAWN_POINT, yaw: 0 },
    progress: { estrellas: 1, derrotas: { desafio1: 2 }, reinicios: { segundoBajo: 1 } },
    dialog: 'bajo.2',
  },
  // 3rd Bajo dialog & narration open (character lost; closing sends player to pick a new character).
  bajo3: {
    spawn: { ...RESPAWN_POINT, yaw: 0 },
    progress: { estrellas: 3, derrotas: { desafio1: 3 }, reinicios: { segundoBajo: 1, tercerBajo: 1 } },
    dialog: 'bajo.3',
  },
  // Extra star lost dialog & narration open (bonus star absorbed the defeat without a bajo).
  bajoVidaExtra: {
    spawn: { ...RESPAWN_POINT, yaw: 0 },
    progress: { ...DESAFIO1_DONE, ...BONO1, estrellas: 3, vidasExtra: 0, vidasExtraPerdidas: 1, derrotas: { desafio2: 1 } },
    dialog: 'bajo.vidaExtra',
  },

  // --- Onboarding & Admin ---
  // Character selection screen (registered student without chosen avatar yet).
  personaje: {
    user: { nickname: undefined, avatarName: undefined, gender: undefined },
  },

  // Character selection screen after losing Elfa and Guerrero to 3rd bajos (shows locked characters).
  personajePerdido: {
    user: { nickname: undefined, avatarName: undefined, gender: undefined, lostCharacters: ['Elfa', 'Guerrero'] },
  },

  // Student registration + Ley 1581 modal on /login.
  registro: {
    user: {
      acceptedLaw1581: false,
      acceptedLaw1581Date: undefined,
      codigoEstudiantil: undefined,
      isRegistrationComplete: false,
      nickname: undefined,
      avatarName: undefined,
      gender: undefined,
    },
  },

  // Admin dashboard (/admin?dev=admin) — signed in as Fabian Stiven Valencia Cordoba (admin) with Danna Guerrero Vargas (student) in the table.
  admin: {
    progress: { ...DESAFIO2_DONE, llegoAlPueblo: true },
    user: {
      name: 'Fabian Stiven Valencia Cordoba',
      nombresApellidos: 'Fabian Stiven Valencia Cordoba',
      email: 'fabian.cordoba@correounivalle.edu.co',
      codigoEstudiantil: '202176931',
      acceptedLaw1581Date: '2026-09-02T19:00:00.000Z',
      nickname: 'fsvc',
      role: 'admin',
    },
  },
};

function parseSpawnParam(raw: string | null): Spawn | undefined {
  if (!raw) return undefined;
  const parts = raw.split(',').map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return undefined;
  return { x: parts[0], y: parts[1], z: parts[2], yaw: Number.isFinite(parts[3]) ? parts[3] : 0 };
}

// Applies URL query modifiers (&vidas=1|2|3, &bonos=0|1|2|hada, &perdidos=Elfa,Gnomo) on top of any preset.
function applyProgressModifiers(base: Partial<GameProgress> | undefined, params: URLSearchParams): Partial<GameProgress> | undefined {
  const vidasParam = params.get('vidas') ?? params.get('estrellas');
  const bonosParam = params.get('bonos');
  if (!vidasParam && !bonosParam) return base;

  const next: Partial<GameProgress> = { ...base };
  const items = new Set(next.collectedItems ?? []);

  if (vidasParam !== null) {
    const stars = Math.min(3, Math.max(1, Number(vidasParam) || 3));
    next.estrellas = stars;
    if (stars === 2 && !next.derrotas) next.derrotas = { desafio1: 1 };
    if (stars === 1 && !next.derrotas) {
      next.derrotas = { desafio1: 2 };
      next.reinicios = { ...next.reinicios, segundoBajo: 1 };
    }
  }

  if (bonosParam === '0') {
    next.estatuaLimpia = false;
    next.estatuaEncendida = false;
    next.bono1Completado = false;
    next.hadaLiberada = false;
    next.bono2Completado = false;
    next.vidasExtra = 0;
    items.delete(ANILLO_ORO);
    items.delete(AMULETO_HADA);
  } else if (bonosParam === '1') {
    Object.assign(next, BONO1);
    items.add(ANILLO_ORO);
    next.vidasExtra = 1;
  } else if (bonosParam === 'hada') {
    Object.assign(next, BONO2);
    items.add(AMULETO_HADA);
    next.vidasExtra = 1;
  } else if (bonosParam === '2') {
    Object.assign(next, BONO1, BONO2);
    items.add(ANILLO_ORO);
    items.add(AMULETO_HADA);
    next.vidasExtra = 2;
  }

  next.collectedItems = [...items];
  return next;
}

function buildDevUser(avatarParam: string | null, perdidosParam: string | null, overrides?: Partial<UserData>): UserData {
  const chosen = CHARACTERS.find((c) => c.glbName.toLowerCase() === avatarParam?.toLowerCase()) ?? CHARACTERS[1]; // Elfa
  const lostFromUrl = perdidosParam
    ? perdidosParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  return {
    uid: DEV_USER_UID,
    name: 'Danna Guerrero Vargas',
    email: 'danna.guerrero@correounivalle.edu.co',
    photoURL: chosen.imagePath,
    acceptedLaw1581: true,
    acceptedLaw1581Date: '2026-10-12T19:10:00.000Z',
    codigoEstudiantil: '202427615',
    nombresApellidos: 'Danna Guerrero Vargas',
    sedeCodigo: '00',
    sedeNombre: 'Cali (Meléndez)',
    facultadCodigo: '05',
    facultadNombre: 'Facultad de Ingeniería',
    programaCodigo: '3743',
    programaNombre: 'Ingeniería de Sistemas',
    isRegistrationComplete: true,
    nickname: 'Danna',
    avatarName: chosen.glbName,
    gender: chosen.gender,
    role: 'student',
    ...overrides,
    ...(lostFromUrl ? { lostCharacters: lostFromUrl } : {}),
  };
}

function installDevInspector() {
  const api = {
    presets: Object.keys(DEV_PRESETS),
    status: () => {
      const world = useWorldStore.getState();
      const zone = useZoneStore.getState();
      const player = usePlayerStore.getState();
      const ui = useUIStore.getState();
      const { progress } = useProgressStore.getState();
      const round = (n: number) => Math.round(n * 100) / 100;
      return {
        ready: world.ready,
        warming: world.warming,
        loadStage: world.loadStage,
        loadPercent: world.loadPercent,
        rendererError: world.rendererError,
        region: zone.region,
        interior: zone.interior,
        position: { x: round(player.position.x), y: round(player.position.y), z: round(player.position.z) },
        action: player.action,
        health: player.health,
        maxHealth: player.maxHealth,
        dialog: ui.dialog,
        backpackOpen: ui.backpackOpen,
        progress,
      };
    },
    teleport: (x: number, y: number, z: number) => usePlayerStore.getState().requestTeleport({ x, y, z }),
    setProgress: (changes: Partial<GameProgress>) => useProgressStore.getState().setProgress(changes),
    heal: () => usePlayerStore.getState().restoreHealth(),
    // Damages the player (a defeat by default): to test the bajos and the extra stars.
    hurt: (amount = 1000) => usePlayerStore.getState().takeDamage(amount),
    openBackpack: (open = true) => useUIStore.getState().setBackpackOpen(open),
    openDialog: (id: string) => useUIStore.getState().openDialog(id),
    closeDialog: () => useUIStore.getState().closeDialog(),
    toast: (msg: string) => useToastStore.getState().showToast(msg),
    startCinematica: () => useCinematicaStore.getState().start(),
  };
  (window as Window & { __DEV_GAME__?: typeof api }).__DEV_GAME__ = api;
}

export function applyDevSession() {
  const params = new URLSearchParams(window.location.search);
  const key = (params.get('dev') || '1').trim();
  const preset = DEV_PRESETS[key] ?? DEV_PRESETS['1'];
  const spawn = parseSpawnParam(params.get('spawn')) ?? preset.spawn ?? null;
  const progress = applyProgressModifiers(preset.progress, params);

  useProgressStore.getState().loadProgress(progress);
  usePlayerStore.getState().setInitialSpawn(spawn);
  installDevInspector();
  useAuthStore.getState().setSession(buildDevUser(params.get('avatar'), params.get('perdidos'), preset.user));

  const dialog = params.get('dialogo') ?? preset.dialog;
  const cinematica = params.get('cinematica') === '1' || preset.cinematica === true;
  const mochila = params.get('mochila') === '1';
  const vidaParam = params.get('vida');
  const initialHealth = vidaParam !== null ? Math.min(100, Math.max(1, Number(vidaParam) || 100)) : null;

  const runWhenReady = () => {
    if (initialHealth !== null && initialHealth < 100) {
      usePlayerStore.getState().restoreHealth();
      usePlayerStore.getState().takeDamage(100 - initialHealth);
    }
    if (mochila) useUIStore.getState().setBackpackOpen(true);
    if (cinematica) useCinematicaStore.getState().start();
    else if (dialog) useUIStore.getState().openDialog(dialog);
  };

  if (useWorldStore.getState().ready) {
    runWhenReady();
  } else {
    const unsub = useWorldStore.subscribe((state) => {
      if (!state.ready) return;
      unsub();
      runWhenReady();
    });
  }
}

