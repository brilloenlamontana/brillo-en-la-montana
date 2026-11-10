import { create } from 'zustand';
import type { Region } from '@/game/world/regions';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

type Point3 = readonly [number, number, number];

// One shot of the final cinematic: the camera glides from `from` to `to` looking at `lookAt`, with the part of the
// map of `region` drawn, while `caption` is read.
export type Shot = { region: Region; from: Point3; to: Point3; lookAt: Point3; caption: string };

// Long enough for the narrator to read the longest caption (7.3 s) between the fades.
export const SHOT_SECONDS = 8.2;
// Each shot fades in from black and out to black: the cut (and the region switching behind it) is never seen.
export const FADE_SECONDS = 0.6;

// The chalice is back: its glow travels down the mountain and the camera follows it across the whole journey, from the
// sanctuary on the summit to Villa Boj (world coordinates, y up).
export const SHOTS: readonly Shot[] = [
  { region: 'cumbre', from: [139, 58, -141], to: [146, 64, -166], lookAt: [158, 66, -153], caption: 'El cáliz vuelve a brillar sobre su altar, y la aguja del santuario lleva su resplandor verde hasta el cielo.' },
  { region: 'cumbre', from: [122, 57, -151], to: [104, 66, -160], lookAt: [141, 54, -154], caption: 'En la Cumbre de la Desolación la nieve se derrite y los viejos árboles vuelven a tener hojas entre las ruinas.' },
  { region: 'pueblo', from: [72, 35, -224], to: [78, 31, -199], lookAt: [90, 25.5, -210], caption: 'Al pie de la montaña, Hedrig aviva su fogata: esa noche nadie llora en los túneles.' },
  { region: 'valle', from: [-8, 20, -92], to: [-46, 25, -96], lookAt: [-36, 24, -135], caption: 'El bosque respira. Desde su casa en la copa del árbol, el elfo ve volver la luz entre las ramas.' },
  { region: 'pantano', from: [44, 21, 6], to: [16, 17, -24], lookAt: [20, 8.5, -50], caption: 'El Pantano de la Tristeza se queda en silencio: ya no hace honor a su nombre.' },
  { region: 'villa', from: [-44, 25, 34], to: [-60, 20, 20], lookAt: [-88, 12, 15], caption: 'Y en la Villa de Boj la tierra vuelve a ser fértil y el frío, por fin, cede. Todo está bien.' },
];

export const CINEMATIC_SECONDS = SHOTS.length * SHOT_SECONDS;

// The final cinematic of the game, played once the chalice is taken; then the final victory is told.
interface CinematicaState {
  // Moment it started (performance.now()), or null while it is not playing.
  startedAt: number | null;
  start: () => void;
  // Ends it (when it runs out, or skipped by the player) and opens the final victory dialog.
  finish: () => void;
}

export const useCinematicaStore = create<CinematicaState>((set, get) => ({
  startedAt: null,
  start: () => {
    useUIStore.getState().setCinematic(true);
    set({ startedAt: performance.now() });
  },
  finish: () => {
    if (get().startedAt === null) return;
    set({ startedAt: null });
    useUIStore.getState().setCinematic(false);
    useUIStore.getState().openDialog(DIALOG.victoria);
  },
}));
