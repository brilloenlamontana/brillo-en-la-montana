import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Group } from 'three';
import type { Backpack } from '@/game/challenges/types';
import { createRenderer } from '@/game/engine/rendering/renderer';
import type { GameProgress } from '@/store/progressStore';
import { BackpackIcon } from './BackpackIcon';

type SlotRect = { x: number; y: number; size: number };

const SPIN_SPEED = 1.2;
const CANVAS_OVER_GRID = { position: 'absolute', inset: 0, pointerEvents: 'none' } as const;
// Share of the slot the model fills.
const MODEL_FILL = 0.62;

// A carried item spinning in place, centered and scaled to fit its slot.
function SpinningItem({ url, slot }: { url: string; slot: SlotRect }) {
  const { scene } = useGLTF(url);
  const spinRef = useRef<Group>(null);
  const model = useMemo(() => {
    const clone = scene.clone();
    // Items also drawn in the world (Hedrig's) come from a frozen scene: let the clone's root follow the recentering.
    clone.matrixAutoUpdate = true;
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    clone.position.sub(box.getCenter(new Vector3()));
    return { clone, maxSize: Math.max(size.x, size.y, size.z) || 1 };
  }, [scene]);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * SPIN_SPEED;
  });

  return (
    <group position={[slot.x, slot.y, 0]} rotation={[0.35, 0, 0]}>
      <group ref={spinRef} scale={(slot.size * MODEL_FILL) / model.maxSize}>
        <primitive object={model.clone} />
      </group>
    </group>
  );
}

type BackpackPanelProps = { backpack: Backpack; progress: GameProgress; onClose: () => void };

// The open backpack of the active challenge: what to do now, and one slot per item with what it is for; carried ones
// spin in 3D (WebGPU, like the world), the rest show their icon faded with where to find them.
export function BackpackPanel({ backpack, progress, onClose }: BackpackPanelProps) {
  const states = backpack.items.map((item) => backpack.stateOf(item.id, progress));
  const ownedCount = states.filter((state) => state === 'owned').length;
  const gridRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [slots, setSlots] = useState<SlotRect[]>([]);

  // The canvas covers the grid with an orthographic camera where 1 unit = 1 px, so each model lands on its slot.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const gridRect = grid.getBoundingClientRect();
      setSlots(
        slotRefs.current.map((slot) => {
          const rect = slot?.getBoundingClientRect();
          if (!rect) return { x: 0, y: 0, size: 0 };
          return {
            x: rect.left + rect.width / 2 - (gridRect.left + gridRect.width / 2),
            y: gridRect.top + gridRect.height / 2 - (rect.top + rect.height / 2),
            size: Math.min(rect.width, rect.height),
          };
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div
        role="dialog"
        aria-labelledby="mochila-titulo"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg sm:max-w-3xl bg-[#f4e4bc] border-2 sm:border-[3px] border-[#5c3a21] rounded-2xl shadow-2xl p-3 sm:p-5 text-[#3e2723] font-sans max-h-[92dvh] overflow-y-auto"
      >
        <header className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
          <BackpackIcon className="w-8 h-8 sm:w-9 sm:h-9" />
          <div className="flex-1">
            <h2 id="mochila-titulo" className="text-xl sm:text-2xl font-serif font-bold">
              Mochila
            </h2>
            <p className="text-xs sm:text-sm text-[#5c3a21]">
              {ownedCount} de {backpack.items.length} objetos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar mochila"
            className="border-2 border-[#5c3a21] bg-[#5c3a21] text-[#f4d03f] hover:bg-[#4a2e1a] rounded-lg px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95"
          >
            Cerrar
          </button>
        </header>

        {/* Wide screens (and phones lying on their side): the goal at the left, the items at the right. */}
        <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start gap-2.5 sm:gap-4">
        <div className="rounded-xl border border-[#5c3a21]/30 bg-[#5c3a21]/10 px-3 py-2 sm:px-4 sm:py-2.5">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#5c3a21]">Qué debes hacer</p>
          <p className="text-xs sm:text-sm leading-snug">{backpack.goal(progress)}</p>
        </div>

        <div ref={gridRef} className="relative grid grid-cols-3 gap-2 sm:gap-3">
          {backpack.items.map(({ id, name, Icon, purpose, hotkey }, i) => {
            const owned = states[i] === 'owned';
            return (
              <div key={id} className="flex flex-col items-center gap-1">
                <div
                  ref={(element) => {
                    slotRefs.current[i] = element;
                  }}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${
                    owned ? 'border-2 border-[#5c3a21] bg-[#5c3a21]/15' : 'border-2 border-dashed border-[#5c3a21]/40 bg-[#5c3a21]/5'
                  }`}
                >
                  {/* Not carried: what it looks like, faded (a check once used up). Carried ones spin in 3D on top. */}
                  {!owned && (states[i] === 'spent' ? <span className="text-2xl font-bold text-[#5c3a21]/50">✓</span> : <Icon className="w-1/2 h-1/2 opacity-35 grayscale" />)}
                </div>
                <span className="text-[11px] sm:text-xs text-center leading-tight font-semibold">{name}</span>
                {!owned && <span className="text-[10px] sm:text-[11px] text-center leading-tight text-[#3e2723]/60">{backpack.hint(id, progress)}</span>}
                {/* What it is for, carried or still to be fetched; nothing once it has done its part. */}
                {states[i] !== 'spent' && (
                  <span className="text-[10px] sm:text-[11px] text-center leading-snug text-[#3e2723]">
                    <strong className="font-bold text-[#5c3a21]">Para qué sirve: </strong>
                    {purpose}
                    {owned && <strong className="block font-bold text-[#5c3a21]">Úsalo con la tecla {hotkey} o tocando su botón.</strong>}
                  </span>
                )}
              </div>
            );
          })}
          <Canvas
            orthographic
            gl={createRenderer}
            camera={{ zoom: 1, position: [0, 0, 500], near: 0.1, far: 2000 }}
            // Inline: R3F's own inline `position: relative` would override a class and drop the canvas into the grid.
            style={CANVAS_OVER_GRID}
          >
            <ambientLight intensity={1.4} />
            <directionalLight position={[200, 300, 400]} intensity={2} />
            <Suspense fallback={null}>
              {slots.length === backpack.items.length &&
                backpack.items.map((item, i) => (states[i] === 'owned' ? <SpinningItem key={item.id} url={item.model} slot={slots[i]} /> : null))}
            </Suspense>
          </Canvas>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
