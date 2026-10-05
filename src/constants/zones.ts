// Zonas circulares en el plano XZ del mundo. exitRadius > enterRadius evita parpadeos al quedarse en el borde.
export type Zone = { center: readonly [number, number]; enterRadius: number; exitRadius: number };

export const VILLA_BOJ_ZONE: Zone = { center: [-86.93, 14.89], enterRadius: 32, exitRadius: 34 };

export const CASA_IMERI_INTERIOR_ZONE: Zone = { center: [20.01, 45.2], enterRadius: 20, exitRadius: 23 };

// Centro de la puerta de Imeri: se abre a 5 m y no se cierra mientras el jugador siga dentro de la casa (8 m).
export const CASA_IMERI_DOOR_ZONE: Zone = { center: [17.17, 44.38], enterRadius: 5, exitRadius: 8 };

export const VILLA_BOJ_GATE_ZONE: Zone = { center: [-53.9, 14.9], enterRadius: 7, exitRadius: 9 };

// Plaza de Villa Boj, libre de edificios; y queda un poco sobre el terreno (10.7) para que el jugador caiga suave.
export const VILLA_BOJ_RESPAWN = { x: -84, y: 12.5, z: 12 } as const;

// Contorno (XZ del mundo) de la mancha café de la textura del terreno: el Pantano de la Tristeza.
export const PANTANO_POLYGON: ReadonlyArray<readonly [number, number]> = [
  [-65.8, -170.4], [-42.2, -167.1], [-12.5, -169.1], [1, -153.6], [1, -143.4], [-5, -146.1], [-9.1, -139.4], [0.4, -135.3],
  [5.8, -119.8], [26, -119.8], [56.4, -94.2], [76.6, -93.5], [80.7, -84.7], [80.7, -65.8], [94.2, -48.9], [106.3, -40.8],
  [125.9, -42.9], [131.3, -38.8], [133.3, -26.7], [126.6, -7.8], [130, 3], [136.7, 3.7], [132, 6.4], [136, 23.3],
  [122.5, 33.4], [104.3, 27.3], [85.4, 37.5], [73.3, 36.1], [60.4, 23.3], [63.1, 7.1], [56.4, -7.8], [31.4, -10.5],
  [18.6, -22.6], [17.2, -36.1], [-13.1, -34.1], [-16.5, -36.8], [-18.5, -60.4], [-22.6, -73.9], [-26, -74.6], [-21.2, -77.3],
  [-22.6, -83.4], [-32, -80], [-42.8, -88.1], [-56.3, -87.4], [-70.5, -92.8], [-73.2, -100.9], [-70.5, -128.6], [-77.3, -151.5],
];

// Al salir del pantano hay que alejarse este margen del borde para que los enemigos vuelvan a sus pozos.
export const PANTANO_EXIT_MARGIN = 4;
