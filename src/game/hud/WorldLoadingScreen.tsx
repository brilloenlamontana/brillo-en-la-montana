import { useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useWorldStore, type LoadStage } from '@/game/engine/rendering/worldStore';

const MESSAGE: Record<LoadStage, string> = {
  downloading: 'Cargando el mundo',
  preparing: 'Preparando tu aventura',
};

// Cover of the world while it opens. One bar and one number that only go up: first the models downloading (drei
// reports each batch separately, so its own percentage restarts; worldStore keeps the highest), then the renderer
// preparing the part of the map where the player appears (see Warmup).
export function WorldLoadingScreen() {
  const stage = useWorldStore((state) => state.loadStage);
  const percent = useWorldStore((state) => state.loadPercent);

  useEffect(() => {
    const { reportDownload } = useWorldStore.getState();
    const { loaded, total } = useProgress.getState();
    reportDownload(loaded, total);
    return useProgress.subscribe((state) => reportDownload(state.loaded, state.total));
  }, []);

  return <LoadingScreen message={`${MESSAGE[stage]}... ${percent}%`} percent={percent} />;
}
