import { useEffect } from 'react';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { hasArrived, isUnlocked } from './mission';

// The player is in the mining town with Challenge 2 passed and that was not recorded yet: Challenge 3 begins (the
// forest trail goes away and the backpack becomes Hedrig's).
function checkArrival() {
  // While loading, Warmup sets the region itself to prepare it: that is not the player arriving.
  if (useWorldStore.getState().warming || useZoneStore.getState().region !== 'pueblo') return;
  const { progress } = useProgressStore.getState();
  if (!isUnlocked(progress) || hasArrived(progress)) return;
  saveProgress({ llegoAlPueblo: true });
  useToastStore.getState().showToast('Llegaste al pueblo minero de Hedrig, al pie de la Cumbre de la Desolación. Revisa tu mochila.');
}

// Records the arrival at Hedrig's mining town: when the player walks into it, or when the world opens there (the
// Challenge 3 checkpoint). Only listens to zone changes and to the end of loading.
export function LlegadaAlPueblo() {
  useEffect(() => {
    const unsubscribeZone = useZoneStore.subscribe(checkArrival);
    const unsubscribeWorld = useWorldStore.subscribe(checkArrival);
    return () => {
      unsubscribeZone();
      unsubscribeWorld();
    };
  }, []);
  return null;
}
