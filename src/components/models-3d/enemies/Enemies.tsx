import { Golem } from './golem/Golem';
import { SprayEffect } from './zumbador/SprayEffect';
import { ZumbadorSwarm } from './zumbador/ZumbadorSwarm';

// Los enemigos viven escondidos en los pozos del Pantano de la Tristeza y solo salen mientras el jugador está en él.
export function Enemies(props: any) {
    return (
        <group name="enemies-swamp" {...props}>
            <Golem scale={2} />
            <ZumbadorSwarm />
            <SprayEffect />
        </group>
    );
}
