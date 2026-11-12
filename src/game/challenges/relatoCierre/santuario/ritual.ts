import { create } from 'zustand';
import { playSfx } from '@/game/engine/audio/audio';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { useCinematicaStore } from '../cinematica/cinematica';
import { DIALOG } from '../dialogs';
import { isCalizTomado } from '../mission';

// The ending of the game, as one scripted scene at the sanctuary:
//   conversacion  the dryad refuses to hand the chalice over and the player answers her (ConversacionDriada); the
//                 avatar stands still, the camera stays free.
//   camino        convinced, she leads the way: both walk through the silver willow doors up to the altar.
//   toque         she lays her hand on the chest the chalice stands on (it stays on its altar); its light bursts
//                 out, the world turns green (the game is completed here) and, a moment later, the final cinematic
//                 plays.
// A visit that is interrupted before the touch (a reload) starts again from the conversation.
export type Fase = 'reposo' | 'conversacion' | 'camino' | 'toque' | 'hecho';

type Point3 = readonly [number, number, number];

// Her way from the plaza to the altar: up the steps, through the left half of the doorway, down the nave. Her 'Tocar'
// clip (Driada.blend) is made for the last point: from there her right hand lands on the chest under the chalice.
export const CAMINO_DRIADA: readonly Point3[] = [
  [150.6, 51.86, -152.65],
  [151.9, 52.47, -152.65],
  [154.2, 52.47, -152.65],
  [160.4, 52.47, -152.7],
  [162.3, 52.47, -153],
];
// She ends facing the altar (+x).
export const ALTAR_YAW = Math.PI / 2;

// The player's way (x, z), one step behind her through the right half of the doorway, to stand beside her and look
// at the chalice. The player sets off for each point once she has reached the next one of hers.
export const CAMINO_JUGADOR: readonly (readonly [number, number])[] = [
  [150.4, -153.4],
  [152.6, -153.4],
  [158.6, -153.7],
  [160.3, -154.5],
  [160.75, -154.25],
];

// Seconds from the touch until her hand is on the chest (2 s in her 'Tocar' clip; the light bursts then) and until the
// cinematic starts.
export const TOQUE_SEGUNDOS = 2.2;
const CINEMATICA_TRAS = 3.4;
// Camera distance during the walk and the touch (m; the usual one is 2).
const CAMARA_ESCENA = 3.2;

interface RitualState {
  fase: Fase;
  // How many points of her way the dryad has reached (written by Driada every frame it changes).
  tramoDriada: number;
  // Moment (performance.now()) the chalice lit up, or null before that.
  encendidoAt: number | null;
  conversar: () => void;
  // The conversation ended: she is convinced and leads the way.
  caminar: () => void;
  setTramoDriada: (tramo: number) => void;
  // She is at the altar: the touch begins.
  tocar: () => void;
  reiniciar: () => void;
}

export const useRitualStore = create<RitualState>((set, get) => ({
  fase: 'reposo',
  tramoDriada: 0,
  encendidoAt: null,
  conversar: () => {
    if (get().fase !== 'reposo' || isCalizTomado(useProgressStore.getState().progress)) return;
    set({ fase: 'conversacion' });
    useUIStore.getState().openDialog(DIALOG.driada);
  },
  caminar: () => {
    if (get().fase !== 'conversacion') return;
    useUIStore.getState().closeDialog();
    playSfx('rc_puertas');
    usePlayerStore.getState().setGuide({ walkTo: null });
    // The camera steps back a little: both of them fit in the picture.
    usePlayerStore.getState().setCameraDistance(CAMARA_ESCENA);
    set({ fase: 'camino', tramoDriada: 0 });
  },
  setTramoDriada: (tramoDriada) => set({ tramoDriada }),
  tocar: () => {
    if (get().fase !== 'camino') return;
    set({ fase: 'toque' });
    setTimeout(encender, TOQUE_SEGUNDOS * 1000);
  },
  reiniciar: () => {
    usePlayerStore.getState().setGuide(null);
    if (get().fase !== 'reposo') usePlayerStore.getState().setCameraDistance(null);
    set({ fase: 'reposo', tramoDriada: 0, encendidoAt: null });
  },
}));

// Her hand is on the chalice: its light bursts out and the game is completed (the world recovers at once).
function encender() {
  const ritual = useRitualStore.getState();
  if (ritual.fase !== 'toque') return;
  useRitualStore.setState({ encendidoAt: performance.now() });
  playSfx('rc_caliz');
  usePlayerStore.getState().restoreHealth();
  saveProgress({ interactedWithDriada: true, calizTomado: true, juegoCompletado: true, juegoCompletadoEn: new Date().toISOString() });
  setTimeout(() => {
    if (useRitualStore.getState().fase !== 'toque') return;
    usePlayerStore.getState().setGuide(null);
    usePlayerStore.getState().setCameraDistance(null);
    useRitualStore.setState({ fase: 'hecho' });
    // The glow travels the whole map (final cinematic); the final victory is told when it ends.
    useCinematicaStore.getState().start();
  }, CINEMATICA_TRAS * 1000);
}
