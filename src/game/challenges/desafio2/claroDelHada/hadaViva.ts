import { Vector3 } from 'three';
import { AMULETO_SITIO, HADA_PEDESTAL } from './lugares';

// What the pieces of the clearing tell each other frame by frame (mutated in place, never re-rendered).

// The clips of the fairy's model (Hada.glb).
export type HadaClip = 'Idle' | 'Atrapada' | 'Volar' | 'Asustada' | 'Queja' | 'Herida' | 'Despegar' | 'Entregar' | 'Celebrar';

// A scene directs the fairy (auxilio.ts, entrega.ts): while `activa`, she is where `position` says (her feet), plays
// `clip`, faces the point `mira`, shines `luz` times her usual light and is turned `giro` radians more (a pirouette).
export const hadaEscena = { activa: false, clip: 'Volar' as HadaClip, position: new Vector3(...HADA_PEDESTAL), mira: new Vector3(), luz: 1, giro: 0 };

// Where the fairy is right now and which way she faces (written by Hada every frame), and whether she already took her
// amulet off the lectern (in this session).
export const hadaViva = { position: new Vector3(...HADA_PEDESTAL), yaw: 0, conAmuleto: false };

// Her hands, when she carries something in front of her chest (clip Entregar).
export function manosDelHada(out: Vector3) {
  return out.set(hadaViva.position.x + Math.sin(hadaViva.yaw) * 0.22, hadaViva.position.y + 0.5, hadaViva.position.z + Math.cos(hadaViva.yaw) * 0.22);
}

// The clearing itself: how open the roots of the lectern are (0 closed over the amulet .. 1 open) and how much the
// fairy trusts whoever comes while she is still caught (0 curled up in fear .. 1 calm).
export const claroVivo = { raices: 0, confianza: 0 };

// The amulet, wherever it is (on the lectern, in her hands, on the avatar's chest): its middle, its size and whether
// it shows.
export const amuletoVivo = { position: new Vector3(...AMULETO_SITIO), escala: 1, visible: true };
