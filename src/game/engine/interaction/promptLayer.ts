// Stacking of the prompts that drei's <Html> draws over the world: by default it gives them a huge z-index, above
// every menu, panel and modal of the game. They stay under the HUD bars (z-20 and up) and the modals (z-50 and up).
export const PROMPT_Z_RANGE: [number, number] = [19, 0];
