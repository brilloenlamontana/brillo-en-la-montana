// Places of the fairy's clearing (world coordinates, y up), measured on Map.blend ("ClaroDelHada").

// Top of the stone pedestal in the middle of the clearing: where the fairy is caught, and the center she flies around.
export const HADA_PEDESTAL: readonly [number, number, number] = [40, 15.63, -230];
// Away from the pedestal toward the trail the player comes by (+z).
export const HACIA_SENDERO = { x: 0, z: 1 } as const;

// Once the cage is cut open she cannot fly yet: she falls here, on the ground between the pedestal and the trail, and
// the avatar kneels by her at AUXILIO_RODILLA (x, z), a little farther out.
export const HADA_SUELO: readonly [number, number, number] = [38.55, 14.482, -227.48];
export const AUXILIO_RODILLA = { x: 38.15, z: -226.79 } as const;

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
