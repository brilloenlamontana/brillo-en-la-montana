import { CHARACTERS } from '@/data/characters';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore, type Spawn } from '@/game/player/playerStore';
import { PLAYER_START } from '@/game/player/spawn';
import { useZoneStore } from '@/game/world/zoneStore';
import { DEV_USER_UID, useAuthStore, type UserData } from '@/store/authStore';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
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

// Where the tunnels come out on the Summit of Desolation (same as relatoCierre's checkpoint; ground at 52.0).
const SALIDA_CUMBRE: Spawn = { x: 107.7, y: 53.6, z: -161.85, yaw: 1.26 };

type DevPreset = {
  progress?: Partial<GameProgress>;
  spawn?: Spawn;
  user?: Partial<UserData>;
};

export const DEV_PRESETS: Record<string, DevPreset> = {
  // Challenge 1 — Villa Boj gate from scratch (default for ?dev=1 or ?dev).
  '1': { spawn: PLAYER_START },
  villa: { spawn: PLAYER_START },
  desafio1: { spawn: PLAYER_START },

  // Challenge 1 — In front of Imeri's house, door unlocked and backpack active.
  imeri: {
    spawn: { x: 14.5, y: 11.8, z: 41, yaw: Math.atan2(3.5, 3) },
    progress: {
      openedMayorLetter: true,
      aldeanoHelp: 'accepted',
      interactedWithImeri: true,
      imeriHelp: 'accepted',
    },
  },

  // Challenge 1 — Dry shore before the Swamp of Sadness with gem, rope and insecticide ready.
  pantano: {
    spawn: { x: 50, y: 12.2, z: 24, yaw: Math.PI / 2 },
    progress: {
      collectedItems: IMERI_ITEMS,
      openedMayorLetter: true,
      aldeanoHelp: 'accepted',
      interactedWithImeri: true,
      imeriHelp: 'accepted',
    },
  },

  // Challenge 2 — At the foot of the giant tree by the Elf, right after Challenge 1.
  desafio2: {
    spawn: { x: -36.4, y: 11.9, z: -122.5, yaw: Math.PI },
    progress: DESAFIO1_DONE,
  },
  elfo: {
    spawn: { x: -36.4, y: 11.9, z: -122.5, yaw: Math.PI },
    progress: DESAFIO1_DONE,
  },

  // Challenge 2 — Dark Forest entrance with the Elf's sword, lens and map in the backpack.
  bosque: {
    spawn: { x: -25, y: 13.3, z: -182, yaw: Math.PI },
    progress: {
      ...DESAFIO1_DONE,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS],
      interactedWithElfo: true,
      elfoHelp: 'accepted',
    },
  },

  // Challenge 3 — In front of Hedrig's house in the mining town.
  desafio3: {
    spawn: { x: 82, y: 25.3, z: -211.6, yaw: Math.PI / 2 },
    progress: { ...DESAFIO2_DONE, llegoAlPueblo: true },
  },
  pueblo: {
    spawn: { x: 82, y: 25.3, z: -211.6, yaw: Math.PI / 2 },
    progress: { ...DESAFIO2_DONE, llegoAlPueblo: true },
  },

  // Bonus 1 — Next to the ruined hut of the statue, at the swamp exit (ground at 8.2).
  choza: {
    spawn: { x: -62, y: 9.9, z: -87.5, yaw: Math.PI },
    progress: DESAFIO1_DONE,
  },

  // Bonus 2 — At the edge of the fairy's clearing near the forest exit, with the elven sword (ground at 14.3).
  claro: {
    spawn: { x: 40, y: 16, z: -221.5, yaw: Math.PI },
    progress: { ...DESAFIO2_DONE },
  },

  // Challenge 3 — By the mine mouth where the Summit tunnels begin, with Hedrig's 3 items in the backpack.
  tuneles: {
    spawn: { x: 97, y: 25.4, z: -196, yaw: 0 },
    progress: {
      ...DESAFIO2_DONE,
      ...HEDRIG_HELP,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ...HEDRIG_ITEMS],
    },
  },

  // Challenge 3 — In the Ogre's hall at the end of the maze (floor at 42.5), spectre already calmed.
  ogro: {
    spawn: { x: 111.5, y: 44, z: -166, yaw: 2 },
    progress: {
      ...DESAFIO2_DONE,
      ...HEDRIG_HELP,
      collectedItems: [...IMERI_ITEMS, ...ELFO_ITEMS, ...HEDRIG_ITEMS],
      espectroCalmado: true,
    },
  },

  // Closing story — Tunnel exit on the Summit of Desolation plateau, Challenge 3 completed.
  cumbre: { spawn: SALIDA_CUMBRE, progress: DESAFIO3_DONE },
  relatoCierre: { spawn: SALIDA_CUMBRE, progress: DESAFIO3_DONE },

  // Closing story — On the plaza in front of the sanctuary door, where the dryad waits (ground at 51.8).
  santuario: {
    spawn: { x: 147, y: 53.4, z: -153, yaw: Math.PI / 2 },
    progress: DESAFIO3_DONE,
  },

  // Onboarding — Character selection screen (registered student without chosen avatar yet).
  personaje: {
    user: { nickname: undefined, avatarName: undefined, gender: undefined },
  },

  // Onboarding — Student registration + Ley 1581 modal on /login.
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

function buildDevUser(avatarParam: string | null, overrides?: Partial<UserData>): UserData {
  const chosen = CHARACTERS.find((c) => c.glbName.toLowerCase() === avatarParam?.toLowerCase()) ?? CHARACTERS[1]; // Elfa
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
    openBackpack: (open = true) => useUIStore.getState().setBackpackOpen(open),
    closeDialog: () => useUIStore.getState().closeDialog(),
  };
  (window as Window & { __DEV_GAME__?: typeof api }).__DEV_GAME__ = api;
}

export function applyDevSession() {
  const params = new URLSearchParams(window.location.search);
  const key = (params.get('dev') || '1').trim();
  const preset = DEV_PRESETS[key] ?? DEV_PRESETS['1'];
  const spawn = parseSpawnParam(params.get('spawn')) ?? preset.spawn ?? null;

  useProgressStore.getState().loadProgress(preset.progress);
  usePlayerStore.getState().setInitialSpawn(spawn);
  installDevInspector();
  useAuthStore.getState().setSession(buildDevUser(params.get('avatar'), preset.user));
}

