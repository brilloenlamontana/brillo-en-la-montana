import type { Challenge } from '@/game/challenges/types';
import type { Spawn } from '@/game/player/playerStore';
import { isJuegoCompletado } from './mission';
import { RelatoCierreDialogs } from './RelatoCierreDialogs';
import { RelatoCierreWorld } from './RelatoCierreWorld';

// Where the tunnels come out on the summit: a few steps out of the exit pit, facing the old avenue that leads to the
// sanctuary (ground at 52.0).
export const SALIDA_CUMBRE: Spawn = { x: 107.7, y: 53.6, z: -161.85, yaw: 1.26 };

// Closing story — the Summit of Desolation: the ruined town, the dryad at the sanctuary door and the chalice on its
// altar, whose taking ends the game. Rules in mission.ts.
export const relatoCierre: Challenge = {
  id: 'relatoCierre',
  title: 'Cumbre de la Desolación',
  World: RelatoCierreWorld,
  Dialogs: RelatoCierreDialogs,
  regions: ['cumbre'],
  startPoint: SALIDA_CUMBRE,
  resumeAt: () => SALIDA_CUMBRE,
  isCompleted: isJuegoCompletado,
};
