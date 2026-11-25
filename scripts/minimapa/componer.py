"""Builds public/sprites-2d/minimapa.webp from the three renders of render.py (plano, relieve, objetos).

    blender -b Map.blend --python scripts/minimapa/render.py -- <dir>/mapa.png <dir>/mapa.json 8
    python scripts/minimapa/componer.py <dir>/mapa public/sprites-2d/minimapa.webp

The ground goes flat (its relief would give away where the hidden wells of the swamp are); only the objects (trees,
roofs, rocks) keep a little shading. Everything is tinted as parchment, and what is not world is plain parchment.
"""
import sys
import numpy as np
from PIL import Image

base, out = sys.argv[1:3]
load = lambda name: np.asarray(Image.open(f'{base}_{name}.png').convert('RGBA'), dtype=np.float32) / 255
flat, relief, objects = load('plano'), load('relieve'), load('objetos')
mask = objects[..., 3:4]
rgb = flat[..., :3] * (1 - mask) + relief[..., :3] * mask
# Parchment over everything, a little brighter (measured against the first map picture of the game).
PARCHMENT = np.array([244, 228, 188], dtype=np.float32) / 255
GAIN = np.array([1.05, 1.043, 1.056], dtype=np.float32)
BACKGROUND = np.array([217, 201, 167], dtype=np.float32) / 255
rgb = np.clip(rgb * PARCHMENT * GAIN, 0, 1)
alpha = flat[..., 3:4]
picture = rgb * alpha + BACKGROUND * (1 - alpha)
Image.fromarray((picture * 255 + 0.5).astype(np.uint8)).save(out, quality=84, method=6)
print(out, picture.shape[1], 'x', picture.shape[0])
