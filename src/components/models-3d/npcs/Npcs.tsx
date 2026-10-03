import { Imeri } from './imeri/Imeri';
import { Aldeano } from './aldeano/Aldeano';

export function Npcs(props: any) {
    return (
        <group name="npcs" {...props}>
            <Imeri position={[0, 14.2, 15]} rotation-y={-Math.PI} scale={1.2} />
            <Aldeano position={[-105, 14.26, 5]} rotation-y={-Math.PI} />
        </group>
    );
}
