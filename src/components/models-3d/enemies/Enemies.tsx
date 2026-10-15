import { VISIBLE_FROM } from '../../../constants/regionVisibility';
import { useVisibleFrom } from '../../../hooks/useRegion';
import { Golem } from './golem/Golem';
import { SprayEffect } from './zumbador/SprayEffect';
import { ZumbadorSwarm } from './zumbador/ZumbadorSwarm';

// Los enemigos viven escondidos en los pozos del Pantano de la Tristeza y solo salen mientras el jugador pisa el lodo.
// Desde la villa, el camino o la casa de Imeri no se dibujan (siguen pensando, pero no cuestan nada en la GPU).
export function Enemies() {
    const visible = useVisibleFrom(VISIBLE_FROM.enemigos);
    return (
        <group name="enemies-swamp">
            <group visible={visible}>
                <Golem scale={2} />
                <ZumbadorSwarm />
            </group>
            <SprayEffect />
        </group>
    );
}
