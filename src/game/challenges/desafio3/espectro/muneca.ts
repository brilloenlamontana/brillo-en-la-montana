import { playSfx } from '@/game/engine/audio/audio';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { isEspectroCalmado } from '../mission';
import { useTunelStore } from '../tunelStore';

const toast = (message: string) => useToastStore.getState().showToast(message);

// The doll can be handed over when the spectre is this close (m).
export const ENTREGA_RANGE = 6;

// Using the doll: near the spectre it stops attacking, turns into the clear figure of the dwarf girl it was, receives
// Simona and leaves in peace (the Espectro component plays the farewell).
export function entregarMuneca() {
  const { progress } = useProgressStore.getState();
  if (isEspectroCalmado(progress)) return;
  const { espectro, setDespedida } = useTunelStore.getState();
  const player = usePlayerStore.getState().position;
  if (!espectro.active || espectro.position.distanceTo(player) > ENTREGA_RANGE) {
    return toast('La muñeca se llama Simona: el espectro de la niña la busca en los túneles. Úsala cuando esté cerca de ti.');
  }
  setDespedida({ x: espectro.position.x, y: player.y, z: espectro.position.z });
  playSfx('d3_muneca');
  saveProgress({ espectroCalmado: true });
  toast('Ante la muñeca el espectro se transforma en la silueta clara de una niña enana: «¡Simona! Gracias por traérmela». La recibe y se aleja con lágrimas en los ojos.');
}
