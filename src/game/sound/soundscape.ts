import type { AmbienceId, MusicId, SfxId } from '@/game/engine/audio/catalog';
import type { Interior, Region } from '@/game/world/regions';

// What each part of the map sounds like: its music, its ambience bed and the ground under the player's feet.

// Small places with a sound of their own inside a region (world coordinates of the challenges that own them).
export type Spot = 'claro' | 'ogro';
const SPOTS: readonly { spot: Spot; x: number; z: number; radius: number; y: readonly [number, number] }[] = [
  // The fairy's clearing in the Dark Forest (Bonus 2), around her pedestal.
  { spot: 'claro', x: 40, z: -230, radius: 16, y: [10, 24] },
  // The Ogre's hall at the end of the tunnels, around his table.
  { spot: 'ogro', x: 115, z: -169, radius: 11, y: [41, 47.5] },
];

export function classifySpot(x: number, y: number, z: number): Spot | null {
  for (const { spot, x: cx, z: cz, radius, y: range } of SPOTS) {
    if (y > range[0] && y < range[1] && Math.hypot(x - cx, z - cz) < radius) return spot;
  }
  return null;
}

export type Place = { region: Region; interior: Interior | null; spot: Spot | null; cinematic: boolean; recovered: boolean };

const REGION_MUSIC: Record<Region, MusicId> = {
  villa: 'mus_villa',
  camino: 'mus_villa',
  casa: 'mus_villa',
  pantano: 'mus_pantano',
  valle: 'mus_bosque',
  bosque: 'mus_bosque',
  pueblo: 'mus_tuneles',
  tuneles: 'mus_tuneles',
  cumbre: 'mus_cumbre',
};

const REGION_AMBIENCE: Record<Region, AmbienceId> = {
  villa: 'amb_villa_invierno',
  camino: 'amb_valle',
  casa: 'amb_valle',
  pantano: 'amb_pantano',
  valle: 'amb_valle',
  bosque: 'amb_bosque',
  pueblo: 'amb_pueblo_minero',
  tuneles: 'amb_tuneles',
  cumbre: 'amb_cumbre',
};

// The ending theme plays over the final cinematic and, once the game is completed, over the recovered world.
const ENDING_MUSIC: MusicId = 'mus_final';

export function musicFor({ region, interior, spot, cinematic, recovered }: Place): MusicId {
  if (cinematic) return ENDING_MUSIC;
  if (interior === 'santuario') return 'mus_cumbre';
  if (interior) return 'mus_hogar';
  if (spot === 'claro') return 'mus_claro_hada';
  if (spot === 'ogro') return 'mus_ogro';
  if (recovered && region !== 'tuneles') return ENDING_MUSIC;
  return REGION_MUSIC[region];
}

export function ambienceFor({ region, interior, spot, cinematic, recovered }: Place): AmbienceId {
  if (cinematic) return 'amb_recuperado';
  if (interior === 'santuario') return 'amb_santuario';
  if (interior) return 'amb_interior_casa';
  if (spot === 'claro') return 'amb_claro_hada';
  if (region === 'tuneles') return 'amb_tuneles';
  if (recovered) return 'amb_recuperado';
  return REGION_AMBIENCE[region];
}

const REGION_FOOTSTEPS: Record<Region, SfxId> = {
  villa: 'jug_pasos_nieve',
  camino: 'jug_pasos_tierra',
  casa: 'jug_pasos_tierra',
  pantano: 'jug_pasos_lodo',
  valle: 'jug_pasos_tierra',
  bosque: 'jug_pasos_hojas',
  pueblo: 'jug_pasos_piedra',
  tuneles: 'jug_pasos_piedra',
  cumbre: 'jug_pasos_nieve',
};

export function footstepsFor(region: Region, interior: Interior | null, recovered: boolean): SfxId {
  if (interior === 'santuario') return 'jug_pasos_piedra';
  if (interior) return 'jug_pasos_madera';
  // The snow is gone once the world recovers.
  if (recovered && REGION_FOOTSTEPS[region] === 'jug_pasos_nieve') return 'jug_pasos_tierra';
  return REGION_FOOTSTEPS[region];
}
