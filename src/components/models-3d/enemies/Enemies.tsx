import { Golem } from './golem/Golem';
import { ZumbadorSwarm } from './zumbador/ZumbadorSwarm';

export function Enemies(props: any) {
    return (
        <group name="enemies-swamp" {...props}>
            <Golem position={[42, 0.2, -33]} scale={2} />
            <ZumbadorSwarm />
        </group>
    );
}
