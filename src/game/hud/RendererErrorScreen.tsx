import type { RendererError } from '@/game/engine/rendering/worldStore';

const MESSAGES: Record<RendererError, { title: string; detail: string }> = {
  unsupported: {
    title: 'Tu navegador no soporta WebGPU',
    detail: 'Brillo en la montaña necesita WebGPU. Usa una versión reciente de Chrome, Edge o Safari, con la aceleración por hardware activada.',
  },
  lost: {
    title: 'Se perdió la conexión con la tarjeta gráfica',
    detail: 'El navegador reinició la GPU. Recarga la página para seguir jugando: tu progreso está guardado.',
  },
};

// Shown instead of the world when it cannot be drawn.
export function RendererErrorScreen({ error }: { error: RendererError }) {
  const { title, detail } = MESSAGES[error];
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-50 p-6 text-center">
      <h1 className="text-lg sm:text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-sm sm:text-base text-slate-300">{detail}</p>
      <button type="button" onClick={() => window.location.reload()} className="uv-btn-primary">
        Recargar
      </button>
    </main>
  );
}
