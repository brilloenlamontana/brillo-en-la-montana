import { useWorldStore } from '@/game/engine/rendering/worldStore';
import type { Interior, Region } from './regions';
import { useZoneStore } from './zoneStore';

// From where a part of the world is drawn (or exists): map regions outdoors and houses indoors. Inside a house only
// `interiors` counts; outdoors, `regions`. Whatever cannot be seen from a region (behind mountains or past the fog) is
// not drawn, so each place only pays for what the player can see.
export type Visibility = { regions: ReadonlySet<Region>; interiors: ReadonlySet<Interior> };

export const visibleFrom = (regions: Region[], interiors: Interior[] = []): Visibility => ({
  regions: new Set(regions),
  interiors: new Set(interiors),
});

const isVisible = ({ regions, interiors }: Visibility, region: Region, interior: Interior | null) =>
  interior ? interiors.has(interior) : regions.has(region);

// Re-render only when the player changes region or house.
export const useRegion = (): Region => useZoneStore((state) => state.region);
export const useInterior = (): Interior | null => useZoneStore((state) => state.interior);

// Whether this part of the world should be drawn from where the player is.
export const useVisibleFrom = (visibility: Visibility): boolean =>
  useZoneStore((state) => isVisible(visibility, state.region, state.interior));

// True while the warmup is visiting a region this part is visible from: things that are normally gated (a closed
// interior, an NPC that has not arrived yet) are drawn once then, so their first real appearance does not stutter.
export function useWarmingHere(visibility: Visibility): boolean {
  const visible = useVisibleFrom(visibility);
  const warming = useWorldStore((state) => state.warming);
  return warming && visible;
}
