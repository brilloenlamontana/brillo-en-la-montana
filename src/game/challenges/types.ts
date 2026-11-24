import type { ComponentType } from 'react';
import type { SfxId } from '@/game/engine/audio/catalog';
import type { GestureAim, GestureName } from '@/game/player/gestureStore';
import type { Point, Spawn } from '@/game/player/playerStore';
import type { Region } from '@/game/world/regions';
import type { GameProgress } from '@/store/progressStore';

// What the story asks of the player right now: one short line that stays on screen (ObjectiveLine) and, when it
// happens at a place, where that place is (its ground), which a beacon of light marks in the world (ObjectiveBeacon).
export type Objective = { text: string; at?: Point };

// The dangerous place of a challenge (the swamp, the forest, the tunnels) and what the game tells the player at its
// edge (DangerWarnings): nobody walks in unprepared, or out with the challenge half done, without being told why.
export interface Danger {
  region: Region;
  // Said on walking in: what the player still lacks to face it and where to get it. Null when ready.
  unprepared: (progress: GameProgress) => string | null;
  // Said on walking out with the challenge unfinished: what is left to do in there. Null when nothing is.
  pending: (progress: GameProgress) => string | null;
}

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
  // How the avatar takes it out of the backpack and uses it (see player/gestureStore).
  gesture: GestureName;
  // What taking it out sounds like, when it has a sound of its own (a sword leaving its sheath).
  drawSound?: SfxId;
  // Whom it is for, if anyone is near: the avatar turns to face that point while it uses the item.
  aim?: GestureAim;
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

// A chapter of the story. Each lives in its own folder (desafio1, desafio2...) with everything it needs: its part of
// the map, NPCs, enemies, dialogs, items and rules. The game only knows this contract (see registry.ts).
export interface Challenge {
  id: string;
  title: string;
  // 3D content, mounted inside <Physics>: map pieces, NPCs, enemies and interactive objects.
  World: ComponentType;
  // DOM overlays (dialogs) drawn over the canvas.
  Dialogs?: ComponentType;
  // Its own HUD pieces (bars, screen effects), drawn over the canvas under the game's HUD.
  Hud?: ComponentType;
  backpack?: Backpack;
  // What to do now while this is the challenge being played (see Objective).
  objective?: (progress: GameProgress) => Objective;
  // Its dangerous place and the warnings at its edge (see Danger).
  danger?: Danger;
  // Map regions it takes place in: a defeat there is a defeat in this challenge.
  regions: readonly Region[];
  // Where the player comes back after a first "bajo" in this challenge.
  startPoint: Point;
  // Checkpoint: where the avatar appears when the player comes back to play another day while this is the current
  // challenge (a separate system from the "bajos").
  resumeAt: (progress: GameProgress) => Spawn;
  // Finished: the next challenge becomes the one being played. Without it the challenge is never finished.
  isCompleted?: (progress: GameProgress) => boolean;
}
