import type { Challenge } from '@/game/challenges/types';
import type { Spawn } from '@/game/player/playerStore';
import { PLAYER_START, RESPAWN_POINT } from '@/game/player/spawn';
import { DESAFIO1_BACKPACK } from './backpack';
import { Desafio1Dialogs } from './Desafio1Dialogs';
import { Desafio1World } from './Desafio1World';

// In front of Imeri's house, between her and the door, facing the door (ground at 10.1).
const FRENTE_CASA_IMERI: Spawn = { x: 14.5, y: 11.8, z: 41, yaw: Math.atan2(3.5, 3) };

// Challenge 1 — Swamp of Sadness. The mayor's letter, the villager, Imeri and her house, the swamp with its traps
// and enemies. Rules in mission.ts, items in items.ts and backpack.ts.
export const desafio1: Challenge = {
  id: 'desafio1',
  title: 'Pantano de la Tristeza',
  World: Desafio1World,
  Dialogs: Desafio1Dialogs,
  backpack: DESAFIO1_BACKPACK,
  regions: ['villa', 'camino', 'casa', 'pantano'],
  // The Villa Boj square.
  startPoint: RESPAWN_POINT,
  // At the Villa Boj gate until the player has spoken with Imeri; from then on, at her house.
  resumeAt: (progress) => (progress.interactedWithImeri ? FRENTE_CASA_IMERI : PLAYER_START),
  isCompleted: (progress) => progress.mision1Completada,
};
