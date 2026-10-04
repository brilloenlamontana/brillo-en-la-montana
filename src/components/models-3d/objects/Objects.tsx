import { Card } from './card/Card';

export function Objects(props: any) {
    return (
        <group name="objects" {...props}>
            <Card position={[0, 11, -5]} rotation-y={-Math.PI}/>
        </group>
    );
}
