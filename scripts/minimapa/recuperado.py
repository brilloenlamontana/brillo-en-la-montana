"""Mapa del mundo recuperado: la misma imagen del minimapa (invierno) con el suelo vuelto verde.

  python scripts/minimapa/recuperado.py

Lee public/sprites-2d/minimapa.webp y escribe public/sprites-2d/minimapa_recuperado.webp. Hay que volver a correrlo
cada vez que se renderice de nuevo el minimapa. El suelo nevado y arenoso (tonos crema y ocre) pasa a pasto; el lodo
del pantano y los caminos quedan como tierra húmeda más oscura; los techos, la madera y la piedra no cambian.
"""
import colorsys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / 'public' / 'sprites-2d'
image = np.asarray(Image.open(ROOT / 'minimapa.webp').convert('RGB')).astype(np.float32) / 255
r, g, b = image[..., 0], image[..., 1], image[..., 2]
high, low = image.max(-1), image.min(-1)
value = high
saturation = np.where(high > 0, (high - low) / np.maximum(high, 1e-6), 0)
# Tono (0..1) solo donde hay color.
span = np.maximum(high - low, 1e-6)
hue = np.where(high == r, ((g - b) / span) % 6, np.where(high == g, (b - r) / span + 2, (r - g) / span + 4)) / 6

# El suelo: cremas, ocres y marrones claros (tono entre naranja y amarillo), y la nieve casi blanca.
earth = (hue > 0.06) & (hue < 0.19) & (saturation > 0.08)
snow = (saturation <= 0.12) & (value > 0.72)
ground = earth | snow
# Cuanto más claro era el suelo, más vivo el pasto; el lodo oscuro queda como tierra verdosa.
light = np.clip((value - 0.25) / 0.6, 0, 1)
grass_hue = 0.27 - 0.03 * light
grass_saturation = np.clip(0.38 + 0.22 * light, 0, 1)
grass_value = np.clip(0.22 + 0.55 * value, 0, 1)

out = image.copy()
to_rgb = np.vectorize(colorsys.hsv_to_rgb)
gr, gg, gb = to_rgb(grass_hue[ground], grass_saturation[ground], grass_value[ground])
out[ground] = np.stack([gr, gg, gb], -1)
Image.fromarray((out * 255).round().astype(np.uint8)).save(ROOT / 'minimapa_recuperado.webp', quality=88, method=6)
print('escrito', ROOT / 'minimapa_recuperado.webp')
