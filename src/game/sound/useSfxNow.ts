import { useEffect } from 'react';
import { playSfxAt } from '@/game/engine/audio/spatial';
import type { SfxId } from '@/game/engine/audio/catalog';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import type { SoundSource } from '@/game/engine/audio/useLoopNear';

// A one-shot effect heard now and then from a place of the world (a goblin giggling among the trees, a rockslide far
// up the mountain): every `every` seconds (a random wait between the two), if `source()` gives a place within
// `radius` meters. `source` must be a stable function (declared outside the component).
export function useSfxNow(id: SfxId, source: SoundSource, radius: number, every: readonly [number, number], volume = 1) {
  const [min, max] = every;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wait = () => {
      timer = setTimeout(
        () => {
          const at = useWorldStore.getState().ready ? source() : null;
          if (at) playSfxAt(id, at, radius, volume);
          wait();
        },
        (min + Math.random() * (max - min)) * 1000,
      );
    };
    wait();
    return () => clearTimeout(timer);
  }, [id, source, radius, min, max, volume]);
}
