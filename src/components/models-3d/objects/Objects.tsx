import { useZoneStore } from '../../../store/zoneStore';
import { Card } from './card/Card';

export function Objects(props: any) {
    const insideVillaBoj = useZoneStore((state) => state.insideVillaBoj);

    return (
        <group name="objects" {...props} visible={!insideVillaBoj}>
            <Card position={[0, 11, -5]} rotation-y={-Math.PI}/>
        </group>
    );
}
