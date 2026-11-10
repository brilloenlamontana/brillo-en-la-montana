# Genera la textura del terreno "recuperado" (el final del juego: el frio cede y la tierra vuelve a ser fertil) a partir
# de la textura invernal horneada que va dentro de Terreno.glb. No necesita Blender:
#
#   python tools/terreno_recuperado.py
#
# Lee   public/models-3d/map/Mapa/Terreno/Terreno.glb  (imagen TerrenoColor, 4096 px, vista cenital del mapa)
# Crea  public/models-3d/map/Mapa/Terreno/TerrenoRecuperado.jpg  (mismas UV: el motor la cambia al completar el juego)
#
# La textura invernal tiene una paleta muy marcada, asi que cada zona se reconoce por su color: nieve (crema claro),
# pasto seco (ocre), roca (gris pardo), tierra de plazas y caminos (canela) y lodo del pantano (pardo oscuro). La nieve y
# el pasto seco pasan a pradera verde con flores, la roca se cubre de musgo, el lodo se vuelve humedal verde y los
# caminos quedan de tierra calida.
import io
import json
import os
import struct

import numpy as np
from PIL import Image, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, 'public', 'models-3d', 'map', 'Mapa', 'Terreno', 'Terreno.glb')
DST = os.path.join(REPO, 'public', 'models-3d', 'map', 'Mapa', 'Terreno', 'TerrenoRecuperado.jpg')
rng = np.random.default_rng(1581)


def imagen_del_glb(path, nombre):
    data = open(path, 'rb').read()
    n = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20:20 + n])
    base = 20 + n + 8
    img = next(i for i in gltf['images'] if i['name'] == nombre)
    bv = gltf['bufferViews'][img['bufferView']]
    ini = base + bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(data[ini:ini + bv['byteLength']])).convert('RGB')


def paso(a, b, x):  # smoothstep
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def difuminar(arr, radio):  # valores 0..1 (el desenfoque de PIL trabaja en 8 bits)
    img = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radio)), dtype=np.float32) / 255


def ruido(size, celda):  # ruido suave 0..1 de manchas de `celda` pixeles
    chico = rng.random((size // celda + 2, size // celda + 2)).astype(np.float32)
    img = Image.fromarray(chico, 'F').resize((size, size), Image.BICUBIC)
    return np.clip(np.asarray(img, dtype=np.float32), 0, 1)


def mezclar(a, b, w):
    return a + (b - a) * w[..., None]


def color(r, g, b):
    return np.array([r, g, b], dtype=np.float32) / 255


src = imagen_del_glb(SRC, 'TerrenoColor')
size = src.size[0]
rgb = np.asarray(src, dtype=np.float32) / 255
v = rgb.max(2)
s = (v - rgb.min(2)) / np.maximum(v, 1e-4)
fuera = v < 0.04  # fuera del mapa (negro): no se toca

# --- zonas, por color
nieve = paso(0.74, 0.86, v) * (1 - paso(0.25, 0.40, s))
ocre = paso(0.35, 0.55, s) * paso(0.30, 0.45, v)
lodo = (1 - paso(0.27, 0.37, v)) * (~fuera)
roca = paso(0.34, 0.42, v) * (1 - paso(0.56, 0.64, v)) * (1 - paso(0.30, 0.42, s))
# pradera: donde manda la nieve (las motas pardas que la salpican quedan dentro y pasan a ser matas y flores)
pradera = paso(0.30, 0.62, difuminar(np.maximum(nieve, ocre * 0.9), 9))
pradera = np.maximum(pradera, np.maximum(nieve, ocre)) * (1 - paso(0.25, 0.6, lodo))
detalle = v - difuminar(v, 6)  # relieve fino de la textura original: se conserva sobre el color nuevo

# --- pradera verde, con manchas claras y oscuras
grande, medio, fino = ruido(size, 160), ruido(size, 40), ruido(size, 6)
pasto = mezclar(np.broadcast_to(color(88, 142, 58), rgb.shape), color(122, 172, 74), paso(0.35, 0.75, grande))
pasto = mezclar(pasto, color(64, 116, 48), paso(0.45, 0.85, medio) * 0.7)
pasto = pasto * (0.92 + 0.16 * fino[..., None]) * (1 + 1.6 * detalle[..., None])
# las motas pardas de la nieve y el pasto seco: matas mas oscuras
matas = np.clip(pradera - nieve, 0, 1) * (1 - ocre)
pasto = mezclar(pasto, pasto * color(190, 215, 170), matas)
out = mezclar(rgb, pasto, pradera)

# --- roca: mas calida y con musgo a manchas
calida = rgb * np.array([1.03, 1.03, 0.93], dtype=np.float32)
musgo = np.broadcast_to(color(80, 128, 60), rgb.shape) * (0.75 + 1.4 * v[..., None])
roca_w = roca * (1 - pradera)
out = mezclar(out, mezclar(calida, musgo, 0.36 + 0.24 * paso(0.25, 0.80, grande)), roca_w)

# --- suelo del bosque (canela grisaceo, mas apagado que las plazas): sotobosque verde
bosque = paso(0.56, 0.60, v) * (1 - paso(0.66, 0.70, v)) * (1 - paso(0.22, 0.32, s)) * (1 - pradera)
soto = mezclar(np.broadcast_to(color(84, 124, 60), rgb.shape), color(104, 146, 68), paso(0.3, 0.8, grande))
out = mezclar(out, soto * (0.9 + 0.2 * fino[..., None]) * (1 + 1.6 * detalle[..., None]), bosque * 0.75)

# --- pantano: de lodo a humedal verde (lo mas oscuro, los pozos, se queda)
humedal = mezclar(np.broadcast_to(color(52, 96, 58), rgb.shape), color(78, 128, 70), paso(0.3, 0.8, medio))
humedal = humedal * (0.85 + 2.2 * (v[..., None] - 0.2))
out = mezclar(out, humedal, lodo * paso(0.06, 0.16, v) * 0.85)

# --- tierra de plazas y caminos: un punto mas calida
tierra = (1 - np.clip(pradera + roca_w + lodo + bosque, 0, 1)) * (~fuera)
out = mezclar(out, out * np.array([1.06, 1.0, 0.88], dtype=np.float32), tierra)

# --- flores: puntos sueltos de color sobre la pradera
semillas = rng.random((size, size)) > 0.9975
flores = np.asarray(Image.fromarray((semillas * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), dtype=np.float32) / 255
tono = np.asarray(Image.fromarray((rng.integers(0, 4, (size // 3 + 1, size // 3 + 1)) * 60).astype(np.uint8)).resize((size, size), Image.NEAREST))
paleta = np.stack([color(250, 248, 235), color(246, 214, 78), color(236, 150, 190), color(170, 140, 225)])
out = mezclar(out, paleta[tono // 60], flores * paso(0.85, 0.98, pradera))

out[fuera] = rgb[fuera]
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(DST, quality=86, optimize=True)
print('ok', DST, os.path.getsize(DST) // 1024, 'KB', size, 'px')
