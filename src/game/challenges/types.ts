import type { ComponentType } from 'react';
import type { GameProgress } from '@/store/progressStore';

// A step of a mission as the admin dashboard lists it.
export type MissionStep = { id: string; label: string; detail: string; done: boolean; status?: string };

// State of a backpack item: not found yet, carried, or used up (it fulfilled its purpose and left the backpack).
export type ItemState = 'missing' | 'owned' | 'spent';

export interface BackpackItem {
  id: string;
  name: string;
  // GLB shown spinning in the backpack panel.
  model: string;
  // Flat icon for the quick item bar.
  Icon: ComponentType<{ className?: string }>;
  // Key that uses the item ('1'...'9'), fixed per item so it never shifts.
  hotkey: string;
}

// The backpack of a challenge: which items it holds and what using each one does.
export interface Backpack {
  items: readonly BackpackItem[];
  // The backpack shows this challenge's items from this point on (e.g. once its helper's offer was accepted).
  isActive: (progress: GameProgress) => boolean;
  stateOf: (id: string, progress: GameProgress) => ItemState;
  // Caption under a slot that is not carried ("En la casa de Imeri", "Pociones 3/5"...).
  hint: (id: string, progress: GameProgress) => string;
  // What the player has to do now: what is left to pick up and where, then what to use it on.
  goal: (progress: GameProgress) => string;
  use: (id: string) => void;
}

// What happens when the player loses the last star in a challenge: the challenge starts over.
export interface ChallengeRestart {
  // Shown in the defeat dialog.
  message: readonly string[];
  // Progress fields to put back as they were at the start of the challenge.
  reset: (progress: GameProgress) => Partial<GameProgress>;
}

// A chapter of the story. Each lives in its own folder (desafio1, desafio2...) with everything it needs: its part of
// the map, NPCs, enemies, dialogs, items and rules. The game only knows this contract (see registry.ts).
export interface Challenge {
  id: string;
  title: string;
  // 3D content, mounted inside <Physics>: map pieces, NPCs, enemies and interactive objects.
  World: ComponentType;
  // DOM overlays (dialogs) drawn over the canvas.
  Dialogs?: ComponentType;
  backpack?: Backpack;
  // Finished: the next challenge becomes the one being played. Without it the challenge is never finished.
  isCompleted?: (progress: GameProgress) => boolean;
  restart?: ChallengeRestart;
}
