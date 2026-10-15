import { useZoneStore } from '../store/zoneStore';
import { useWorldStore } from '../store/worldStore';
import type { Region } from '../utils/regions';

// Solo provoca un re-render cuando el jugador cambia de región.
export function useRegion(): Region {
  return useZoneStore((state) => state.region);
}

// true si la parte del mundo se dibuja desde la región actual (o mientras se calienta el renderer al cargar).
export function useVisibleFrom(regions: ReadonlySet<Region>): boolean {
  const visible = useZoneStore((state) => regions.has(state.region));
  const warming = useWorldStore((state) => state.warming);
  return visible || warming;
}
