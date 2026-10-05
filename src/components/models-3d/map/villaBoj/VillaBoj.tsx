import { Empalizada } from './Empalizada';
import { Porton } from './Porton';
import { Villa } from './Villa';

export function VillaBoj(props: any) {
  return (
    <group name="VillaBoj" {...props}>
      <Empalizada />
      <Porton />
      <Villa />
    </group>
  );
}
