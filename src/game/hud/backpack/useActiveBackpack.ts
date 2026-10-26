import { activeBackpack } from '@/game/challenges/registry';
import { useProgressStore } from '@/store/progressStore';

// The backpack in use and the progress it is read from. Progress only changes when something is saved, so the HUD
// re-renders rarely.
export function useActiveBackpack() {
  const progress = useProgressStore((state) => state.progress);
  return { backpack: activeBackpack(progress), progress };
}
