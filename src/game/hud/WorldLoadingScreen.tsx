import { useProgress } from '@react-three/drei';
import { LoadingScreen } from '@/components/LoadingScreen';

// Cover of the world while it opens: first how much of the models is downloaded and decoded, then a last step while
// the renderer prepares the part of the map where the player appears (see Warmup).
export function WorldLoadingScreen() {
  const { active, progress } = useProgress();
  const loading = active || progress < 100;
  return loading ? (
    <LoadingScreen message={`Cargando el mundo... ${Math.round(progress)}%`} percent={progress * 0.9} />
  ) : (
    <LoadingScreen message="Preparando tu aventura..." percent={95} />
  );
}
