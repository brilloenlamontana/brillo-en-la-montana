import { useZoneStore } from '../../../store/zoneStore';
import { useProgressStore } from '../../../store/progressStore';
import { Imeri } from './imeri/Imeri';
import { Aldeano } from './aldeano/Aldeano';

// En el camino del portón a la plaza de Villa Boj, mirando hacia la entrada (+x).
const ALDEANO_POSITION: [number, number, number] = [-68, 10.7, 15];
const ALDEANO_ROTATION: [number, number, number] = [0, Math.PI / 2, 0];

// Frente a su casa, a ras del terreno (10.37), mirando hacia el camino (-x).
const IMERI_POSITION: [number, number, number] = [10, 10.37, 40];
const IMERI_ROTATION: [number, number, number] = [0, -Math.PI / 2, 0];

export function Npcs(props: any) {
    const insideVillaBoj = useZoneStore((state) => state.insideVillaBoj);
    // Imeri solo espera en su casa si el jugador aceptó la ayuda del aldeano.
    const imeriAtHome = useProgressStore((state) => state.progress.aldeanoHelp === 'accepted');

    return (
        <group name="npcs" {...props}>
            {imeriAtHome && (
                <group visible={!insideVillaBoj}>
                    <Imeri position={IMERI_POSITION} rotation={IMERI_ROTATION} />
                </group>
            )}
            <Aldeano position={ALDEANO_POSITION} rotation={ALDEANO_ROTATION} />
        </group>
    );
}
