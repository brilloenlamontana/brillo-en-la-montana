import { useWorldStore } from '@/game/engine/rendering/worldStore';
import type { Interior, Region } from './regions';
import { useZoneStore } from './zoneStore';

// From where a part of the world is prepared while loading: map regions outdoors and houses indoors (inside a house
// only `interiors` counts; outdoors, `regions`). Once the game is open every part is drawn all the time (see
// useVisibleFrom); the lists remain as the order in which the loading screen prepares the map.
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

// Whether this part of the world is drawn. While playing, always: the whole world stays drawn, so nothing appears or
// disappears as the player walks from one place to another (parts used to be shown and hidden by region, and that was
// seen). What is out of the camera's view is still skipped by the renderer, object by object. Only while the world is
// prepared behind the loading screen does the region count: Warmup visits the regions one at a time, so the whole map
// is never drawn in a single frame (that hung integrated graphics cards).
export function useVisibleFrom(visibility: Visibility): boolean {
  const warming = useWorldStore((state) => state.warming);
  const here = useZoneStore((state) => isVisible(visibility, state.region, state.interior));
  return !warming || here;
}

// True while the warmup is visiting a region this part is visible from: things that are normally gated (a closed
// interior, an NPC that has not arrived yet) are drawn once then, so their first real appearance does not stutter.
export function useWarmingHere(visibility: Visibility): boolean {
  const here = useZoneStore((state) => isVisible(visibility, state.region, state.interior));
  const warming = useWorldStore((state) => state.warming);
  return warming && here;
}
