import type { ComponentType } from 'react';
import type { SfxId } from '@/game/engine/audio/catalog';
import type { GestureAim, GestureName } from '@/game/player/gestureStore';
import type { Point, Spawn } from '@/game/player/playerStore';
import type { Region } from '@/game/world/regions';
import type { GameProgress } from '@/store/progressStore';

// What the story asks of the player right now: one short line that stays on screen (ObjectiveLine) and, when it
// happens at a place, where that place is (its ground), which a beacon of light marks in the world (ObjectiveBeacon).
// `exit`: for a dangerous place that is crossed (the swamp), its far shore: marked instead of `at` while the player is
// inside, so nobody wanders off toward the wrong side of it.
export type Objective = { text: string; at?: Point; exit?: Point };

// The dangerous place of a challenge (the swamp, the forest, the tunnels) and what the game tells the player at its
// edge (DangerWarnings): nobody walks in unprepared, or out with the challenge half done, without being told why.
// What a character who already helped says on being spoken to again: a few words on what to do now, and the recorded
// voice that says exactly that (id of docs/sonido/guion_voces.csv).
export interface Hint {
  voice: string;
  paragraphs: string[];
}

export interface Danger {
  region: Region;
  // Said on walking out of it with the challenge unfinished: that it is not passed and what is still to be done in
  // there (players walked out the far side and found nobody waiting, without knowing why). Nothing is said on walking
  // in.
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
  // What it is for and when to use it, in one line: told on picking it up and written under it in the backpack.
  purpose: string;
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
  // What the player has to do now: what is left to pick up and where, then where to go.
  goal: (progress: GameProgress) => string;
  use: (id: string) => void;
}

// A chapter of the story. Each lives in its own folder (desafio1, desafio2...) with everything it needs: its part of
// the map, NPCs, enemies, dialogs, items and rules. The game only knows this contract (see registry.ts).
// A list as it reads in a sentence: "a", "a y b", "a, b y c".
export const listed = (parts: readonly string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`);

// What is told on picking an item up: that it is in the backpack, what it is for and how it is taken out.
export const pickupNotice = (item: Pick<BackpackItem, 'name' | 'purpose' | 'hotkey'>) =>
  `Guardaste en tu mochila: ${item.name}. ${item.purpose} Se usa con la tecla ${item.hotkey} o tocando su botón en la pantalla.`;

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
  // What to do now while this is the challenge being played (see Objective). `there`: the player is already inside its
  // dangerous place (danger.region); having walked in, even without everything offered, the objective is what is to
  // be done in there: fetching things is offered, never demanded.
  objective?: (progress: GameProgress, there?: boolean) => Objective;
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
