import { AnilloHud } from './chozaEstatua/AnilloHud';
import { EncendidoHud } from './chozaEstatua/EncendidoHud';
import { LimpiezaHud } from './chozaEstatua/LimpiezaHud';

// HUD of Challenge 1 (each piece renders only while it applies).
export function Desafio1Hud() {
  return (
    <>
      <LimpiezaHud />
      <EncendidoHud />
      <AnilloHud />
    </>
  );
}
