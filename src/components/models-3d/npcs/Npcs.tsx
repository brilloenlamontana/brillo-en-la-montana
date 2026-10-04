import { Imeri } from './imeri/Imeri';
import { Aldeano } from './aldeano/Aldeano';

export function Npcs(props: any) {
    return (
        <group name="npcs" {...props}>
            <Imeri position={[10, 10.5, 40]} rotation-y={-Math.PI * 0.5} />
            <Aldeano position={[-105, 10.5, 5]} rotation-y={-Math.PI} />
        </group>
    );
}
