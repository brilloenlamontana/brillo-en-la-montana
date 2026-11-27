// Places of the fairy's clearing (world coordinates, y up), measured on Map.blend ("ClaroDelHada").

// Top of the stone pedestal in the middle of the clearing: where the fairy is caught, and the center she flies around.
export const HADA_PEDESTAL: readonly [number, number, number] = [40, 15.63, -230];
// Away from the pedestal toward the trail the player comes by (+z).
export const HACIA_SENDERO = { x: 0, z: 1 } as const;

// Until she is freed she never leaves the middle of the pedestal: once the cage is cut open she cannot fly yet and
// sinks down right there (she used to fall to the ground beside it, and was then found "somewhere else"). The avatar
// comes to the foot of the pedestal on the trail's side, at AUXILIO_RODILLA (x, z), and holds a hand up to her (the
// pedestal is 2.4 m across and 1.1 m high: she is out of reach, the hand is offered).
export const HADA_SUELO: readonly [number, number, number] = HADA_PEDESTAL;
export const AUXILIO_RODILLA = { x: 38.57, z: -227.53 } as const;

// The root lectern: the middle of its top, where her amulet rests under the roots that close over it.
export const ATRIL: readonly [number, number, number] = [40.243, 15.663, -227.688];
export const AMULETO_SITIO: readonly [number, number, number] = [40.243, 15.61, -227.688];
// Freed, she waits here (hovering by the lectern, on the trail's side) with the amulet, and the avatar kneels at
// ENTREGA_PIE (x, z) to receive it.
export const HADA_ESPERA: readonly [number, number, number] = [40.3, 15.9, -227.1];
export const ENTREGA_PIE = { x: 40.33, z: -226.4 } as const;

// The roots of the lectern ("AtrilDedoA..E" of ClaroInteractivos): the axis each one turns around to open outward.
export const ATRIL_DEDOS: readonly (readonly [node: string, x: number, z: number])[] = [
  ['AtrilDedoA', -0.309, -0.9511],
  ['AtrilDedoB', -1, 0],
  ['AtrilDedoC', -0.309, 0.9511],
  ['AtrilDedoD', 0.809, 0.5878],
  ['AtrilDedoE', 0.809, -0.5878],
];
