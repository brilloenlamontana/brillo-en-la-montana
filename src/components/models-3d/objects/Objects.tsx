import { VISIBLE_FROM } from '../../../constants/regionVisibility';
import { MAYOR_CARD_POSITION, MAYOR_CARD_ROTATION_Y } from '../../../constants/zones';
import { useVisibleFrom } from '../../../hooks/useRegion';
import { Card } from './card/Card';

export function Objects() {
    const visible = useVisibleFrom(VISIBLE_FROM.mayorCard);

    return (
        <group name="objects" visible={visible}>
            <Card position={MAYOR_CARD_POSITION} rotation-y={MAYOR_CARD_ROTATION_Y} />
        </group>
    );
}
