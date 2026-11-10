import { Shape, ShapeGeometry } from 'three';

// A flat chevron lying on the ground, pointing to +z (trail markers).
export function chevronGeometry(size = 0.42) {
  const shape = new Shape();
  shape.moveTo(0, size);
  shape.lineTo(size, 0);
  shape.lineTo(size, -size * 0.48);
  shape.lineTo(0, size * 0.48);
  shape.lineTo(-size, -size * 0.48);
  shape.lineTo(-size, 0);
  shape.closePath();
  return new ShapeGeometry(shape).rotateX(Math.PI / 2);
}
