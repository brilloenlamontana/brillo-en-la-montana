import { HambreBar } from './frutos/HambreBar';
import { LenteOverlay } from './frutos/LenteOverlay';

// HUD of Challenge 2: the lens view and the forest's hunger bar (each renders only while it applies).
export function Desafio2Hud() {
  return (
    <>
      <LenteOverlay />
      <HambreBar />
    </>
  );
}
