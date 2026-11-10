import { useMundoRecuperado } from './recuperado';

// Winter: white sky, thick cold fog from a few metres away, bluish light.
const INVIERNO = { sky: '#ffffff', fog: '#e2e8f0', fogNear: 5, ambient: 0.9, ambientColor: '#ffffff', sun: 2, sunColor: '#dbeafe' };
// Recovered world (game completed): clear blue sky, only a far haze, warm sunlight.
const RECUPERADO = { sky: '#9ed3ff', fog: '#9ed3ff', fogNear: 70, ambient: 1.05, ambientColor: '#fff6dc', sun: 2.6, sunColor: '#fff0c2' };
const FOG_FAR = 200;

// Sky, fog and lights shared by the whole map. The fog ends at 200 m: models farther than that are never drawn.
export function Ambience() {
  const look = useMundoRecuperado() ? RECUPERADO : INVIERNO;
  return (
    <>
      <color key={`sky-${look.sky}`} attach="background" args={[look.sky]} />
      <fog key={`fog-${look.fog}`} attach="fog" args={[look.fog, look.fogNear, FOG_FAR]} />
      <ambientLight intensity={look.ambient} color={look.ambientColor} />
      <directionalLight position={[100, 100, 50]} intensity={look.sun} color={look.sunColor} />
    </>
  );
}
