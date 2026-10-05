import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, type Group } from 'three';
import { countPociones, hasMochilaItem, MOCHILA_ITEMS, POCION_IDS } from '../../../constants/recogibles';
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
  const collected = useProgressStore((state) => state.progress.collectedItems ?? []);
  const owned = MOCHILA_ITEMS.map((item) => hasMochilaItem(item.id, collected));
  const pociones = countPociones(collected);
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
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        role="dialog"
        aria-labelledby="mochila-titulo"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(560px, 100%)',
          background: '#f4e4bc',
          border: '3px solid #5c3a21',
          borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
          padding: '18px 20px 20px',
          color: '#3e2723',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <BackpackIcon className="w-9 h-9" />
          <div style={{ flex: 1 }}>
            <h2 id="mochila-titulo" style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'Georgia, serif' }}>Mochila</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#5c3a21' }}>
              {owned.filter(Boolean).length} de {MOCHILA_ITEMS.length} objetos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar mochila"
            style={{ border: '2px solid #5c3a21', background: '#5c3a21', color: '#f4d03f', borderRadius: '8px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Cerrar
          </button>
        </header>

        <div ref={gridRef} style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${MOCHILA_ITEMS.length}, minmax(0, 1fr))`, gap: '14px' }}>
          {MOCHILA_ITEMS.map((item, i) => {
            const isCollected = owned[i];
            const missingLabel = item.id === 'insecticida' ? `Pociones ${pociones}/${POCION_IDS.length}` : 'Sin recoger';
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div
                  ref={(element) => {
                    slotRefs.current[i] = element;
                  }}
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: '10px',
                    border: isCollected ? '2px solid #5c3a21' : '2px dashed rgba(92,58,33,0.45)',
                    background: isCollected ? 'rgba(92,58,33,0.14)' : 'rgba(92,58,33,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(92,58,33,0.45)',
                    fontSize: '1.6rem',
                    fontWeight: 'bold',
                  }}
                >
                  {!isCollected && '?'}
                </div>
                <span style={{ fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.15, color: isCollected ? '#3e2723' : 'rgba(62,39,35,0.55)' }}>
                  {isCollected ? item.name : missingLabel}
                </span>
              </div>
            );
          })}
          <Canvas
            orthographic
            camera={{ zoom: 1, position: [0, 0, 500], near: 0.1, far: 2000 }}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
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
