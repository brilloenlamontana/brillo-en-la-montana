import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { useBosqueStore } from '../bosqueStore';
import { getItemState } from '../mission';

// The lens only shows anything while the player carries it: a lens left on before it was spent (or before a story
// restart) shows nothing.
const lenteActivo = (on: boolean, progress: GameProgress) => on && getItemState('lente', progress) === 'owned';

// For per-frame code.
export const isLenteActivo = () => lenteActivo(useBosqueStore.getState().lente, useProgressStore.getState().progress);

// For components: re-renders only when it changes.
export function useLenteActivo(): boolean {
  const on = useBosqueStore((state) => state.lente);
  const owned = useProgressStore((state) => getItemState('lente', state.progress) === 'owned');
  return on && owned;
}
