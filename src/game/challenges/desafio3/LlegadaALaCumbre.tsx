import { useEffect } from 'react';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from './dialogs';
import { isDesafio3Completado, isOgroVencido } from './mission';

// The player comes out of the exit pit onto the summit with the Ogre beaten and that was not recorded yet: Challenge 3
// is completed (health back to full) and the arrival is told.
function checkSummit() {
  // While loading, Warmup sets the region itself to prepare it: that is not the player arriving.
  if (useWorldStore.getState().warming || useZoneStore.getState().region !== 'cumbre') return;
  const { progress } = useProgressStore.getState();
  if (!isOgroVencido(progress) || isDesafio3Completado(progress)) return;
  usePlayerStore.getState().restoreHealth();
  saveProgress({ mision3Completada: true, mision3CompletadaEn: new Date().toISOString() });
  useUIStore.getState().openDialog(DIALOG.cumbre);
}

// Records the arrival at the Summit of Desolation: when the player climbs out of the tunnels, or when the world opens
// there. Only listens to zone changes and to the end of loading.
export function LlegadaALaCumbre() {
  useEffect(() => {
    const unsubscribeZone = useZoneStore.subscribe(checkSummit);
    const unsubscribeWorld = useWorldStore.subscribe(checkSummit);
    return () => {
      unsubscribeZone();
      unsubscribeWorld();
    };
  }, []);
  return null;
}
