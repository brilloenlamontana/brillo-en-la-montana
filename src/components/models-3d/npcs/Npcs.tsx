import { VISIBLE_FROM } from '../../../constants/regionVisibility';
import { useVisibleFrom } from '../../../hooks/useRegion';
import { useProgressStore } from '../../../store/progressStore';
import { useWorldStore } from '../../../store/worldStore';
import { Imeri } from './imeri/Imeri';
import { Aldeano } from './aldeano/Aldeano';

// En la plaza de Villa Boj, a la vista apenas se cruza el portón y mirando hacia él (+x). El suelo ahí está a 10.87.
const ALDEANO_POSITION: [number, number, number] = [-72, 10.87, 15.5];
const ALDEANO_ROTATION: [number, number, number] = [0, Math.PI / 2, 0];

// Frente a su casa, sobre la senda del porche (suelo a 10.27), mirando hacia el camino que llega de la villa.
const IMERI_POSITION: [number, number, number] = [10.5, 10.27, 41.5];
const IMERI_ROTATION: [number, number, number] = [0, -1.92, 0];

export function Npcs() {
    const aldeanoVisible = useVisibleFrom(VISIBLE_FROM.aldeano);
    const imeriVisible = useVisibleFrom(VISIBLE_FROM.imeri);
    // Imeri solo espera en su casa si el jugador aceptó la ayuda del aldeano.
    const imeriAtHome = useProgressStore((state) => state.progress.aldeanoHelp === 'accepted');
    const warming = useWorldStore((state) => state.warming);

    return (
        <group name="npcs">
            <Imeri position={IMERI_POSITION} rotation={IMERI_ROTATION} present={imeriAtHome} visible={warming || (imeriAtHome && imeriVisible)} />
            <Aldeano position={ALDEANO_POSITION} rotation={ALDEANO_ROTATION} visible={aldeanoVisible} />
        </group>
    );
}
