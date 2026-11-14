import { ClaroHud } from './claroDelHada/ClaroHud';
import { RescateHud } from './claroDelHada/RescateHud';
import { HambreBar } from './frutos/HambreBar';
import { LenteOverlay } from './frutos/LenteOverlay';

// HUD of Challenge 2: the lens view, the forest's hunger bar and the scenes of the fairy's clearing (each renders
// only while it applies).
export function Desafio2Hud() {
  return (
    <>
      <LenteOverlay />
      <HambreBar />
      <RescateHud />
      <ClaroHud />
    </>
  );
}
