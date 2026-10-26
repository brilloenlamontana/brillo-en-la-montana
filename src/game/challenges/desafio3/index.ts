import type { Challenge } from '@/game/challenges/types';
import { Desafio3World } from './Desafio3World';

// Challenge 3 — Summit of Desolation tunnels. Only its world is rendered so far.
export const desafio3: Challenge = {
  id: 'desafio3',
  title: 'Túneles de la Cumbre',
  World: Desafio3World,
};
