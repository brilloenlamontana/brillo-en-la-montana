import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Group } from 'three';
import { countPocionesFrom, getMochilaItemState } from '../../../constants/mission';
import { MOCHILA_ITEMS, POCION_IDS } from '../../../constants/recogibles';
import { useProgressStore } from '../../../store/progressStore';
import { BackpackIcon } from './BackpackIcon';

type SlotRect = { x: number; y: number; size: number };

const SPIN_SPEED = 1.2;
const MODEL_FILL = 0.62; // fracción del espacio que ocupa el objeto 3D

// Objeto recogido girando sobre sí mismo, centrado y escalado para caber en su espacio.
function SpinningItem({ url, slot }: { url: string; slot: SlotRect }) {
  const { scene } = useGLTF(url);
  const spinRef = useRef<Group>(null);
  const model = useMemo(() => {
    const clone = scene.clone();
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

export function BackpackPanel({ onClose }: { onClose: () => void }) {
  const progress = useProgressStore((state) => state.progress);
  const states = MOCHILA_ITEMS.map((item) => getMochilaItemState(item.id, progress));
  const owned = states.map((state) => state === 'owned');
  const pociones = countPocionesFrom(progress);
  const gridRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [slots, setSlots] = useState<SlotRect[]>([]);

  // El canvas cubre la cuadrícula con una cámara ortográfica de 1 unidad = 1 px, así cada objeto cae en su espacio.
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
    >
      <div
        role="dialog"
        aria-labelledby="mochila-titulo"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg bg-[#f4e4bc] border-2 sm:border-[3px] border-[#5c3a21] rounded-2xl shadow-2xl p-4 sm:p-6 text-[#3e2723] font-sans max-h-[92vh] overflow-y-auto"
      >
        <header className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
          <BackpackIcon className="w-8 h-8 sm:w-9 sm:h-9" />
          <div className="flex-1">
            <h2 id="mochila-titulo" className="text-xl sm:text-2xl font-serif font-bold text-[#3e2723]">Mochila</h2>
            <p className="text-xs sm:text-sm text-[#5c3a21]">
              {owned.filter(Boolean).length} de {MOCHILA_ITEMS.length} objetos
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

        <div ref={gridRef} className="relative grid grid-cols-3 gap-2.5 sm:gap-4">
          {MOCHILA_ITEMS.map((item, i) => {
            const isCollected = owned[i];
            // Gastado: ya cumplió su función y salió de la mochila.
            const missingLabel =
              states[i] === 'spent' ? 'Ya lo usaste' : item.id === 'insecticida' ? `Pociones ${pociones}/${POCION_IDS.length}` : 'Sin recoger';
            return (
              <div key={item.id} className="flex flex-col items-center gap-1.5">
                <div
                  ref={(element) => {
                    slotRefs.current[i] = element;
                  }}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center font-bold text-xl sm:text-2xl transition-all ${
                    isCollected
                      ? 'border-2 border-[#5c3a21] bg-[#5c3a21]/15'
                      : 'border-2 border-dashed border-[#5c3a21]/40 bg-[#5c3a21]/5 text-[#5c3a21]/45'
                  }`}
                >
                  {!isCollected && (states[i] === 'spent' ? '✓' : '?')}
                </div>
                <span className={`text-[11px] sm:text-xs text-center leading-tight line-clamp-2 ${
                  isCollected ? 'text-[#3e2723] font-semibold' : 'text-[#3e2723]/60'
                }`}>
                  {isCollected ? item.name : missingLabel}
                </span>
              </div>
            );
          })}
          <Canvas
            orthographic
            camera={{ zoom: 1, position: [0, 0, 500], near: 0.1, far: 2000 }}
            className="absolute inset-0 pointer-events-none"
          >
            <ambientLight intensity={1.4} />
            <directionalLight position={[200, 300, 400]} intensity={2} />
            <Suspense fallback={null}>
              {slots.length === MOCHILA_ITEMS.length &&
                MOCHILA_ITEMS.map((item, i) => (owned[i] ? <SpinningItem key={item.id} url={item.url} slot={slots[i]} /> : null))}
            </Suspense>
          </Canvas>
        </div>
      </div>
    </div>,
    document.body,
  );
}
