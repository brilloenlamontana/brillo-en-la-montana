# Uso (Python del sistema, no el de Blender):
#   python tools/blender/gesto.py <Clip> [--cuadros auto|todos|0,4,8] [--cada N] [--personaje Humana] [--trabajo carpeta] [--sin-vista]
#
# Genera un gesto y lo deja listo para revisarlo sin abrir el juego:
#   1. gestos.py (Blender, esqueleto canonico): resuelve el gesto de tools/blender/gestos/<Clip>.json, exporta
#      public/models-3d/animations/shared/<Clip>.glb y deja la pose de cada cuadro y las medidas.
#   2. gestos_vista.py (Blender, un personaje real): imagenes de los cuadros pedidos con el objeto en la mano.
#   3. Hojas de contacto <trabajo>/<Clip>/hoja_N.jpg (columnas = cuadros; filas = de frente, de lado, como lo ve el
#      jugador (camara detras y arriba) y desde arriba) y
#      detalle.jpg (la mano con el objeto, de cerca).
# Imprime las medidas por cuadro y los avisos anatomicos.
import argparse, json, os, subprocess, sys, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
BLENDER = r'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
MODELOS = r'G:\Mi unidad\PROYECTO MEN\Modelos 3D'
CANON = os.path.join(MODELOS, 'Animaciones', 'Animaciones.blend')
PERSONAJES = {n: os.path.join(MODELOS, 'PersonajesFemeninos', n + '.blend') for n in ('Draconia', 'Elfa', 'Enana', 'Gnoma', 'Humana', 'Tiflina')}
PERSONAJES.update({n: os.path.join(MODELOS, 'PersonajesMasculinos', n + '.blend') for n in ('Draconiano', 'Elfo', 'Enano', 'Gnomo', 'Humano', 'Tiflin')})
COLUMNAS = 8

p = argparse.ArgumentParser()
p.add_argument('clip')
p.add_argument('--cuadros', default='auto')
p.add_argument('--cada', type=int, default=0)
p.add_argument('--personaje', default='Humana')
p.add_argument('--trabajo', default=os.path.join(tempfile.gettempdir(), 'brillo-gestos'))
p.add_argument('--sin-vista', action='store_true')
args = p.parse_args()
os.makedirs(args.trabajo, exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8')


def blender(blend, script, *extra):
    r = subprocess.run([BLENDER, '--background', blend, '--python', os.path.join(AQUI, script), '--', *extra], capture_output=True, text=True, errors='replace')
    return r


spec = json.load(open(os.path.join(AQUI, 'gestos', args.clip + '.json'), encoding='utf-8'))
blender(CANON, 'gestos.py', os.path.join(RAIZ, 'public', 'models-3d', 'animations'), args.trabajo, args.clip)
rep = json.load(open(os.path.join(args.trabajo, '_reporte_%s.json' % args.clip), encoding='utf-8'))
if rep.get('status') != 'ok':
    print('ERROR al generar el gesto:\n' + rep.get('err', '(sin detalle)'))
    sys.exit(1)
med = json.load(open(os.path.join(args.trabajo, args.clip + '.medidas.json'), encoding='utf-8'))
n = len(med['cuadros'])
print('%s: %d cuadros (%.2f s a 30 fps). GLB exportado: public/models-3d/animations/shared/%s.glb' % (args.clip, n, med['duracion'], args.clip))

# Medidas por cuadro.
lados = [l for l in ('derecho', 'izquierdo') if l in med['cuadros'][0]]
print('\ncuadro  t     ' + '   '.join('%s: muneca(adelante,izq,arriba m)  codo  alcance  mun.dobl/supin  vel m/s' % l for l in lados) + ('   punta del objeto (m)  filo' if any('punta_m' in c for c in med['cuadros']) else ''))
for c in med['cuadros']:
    fila = '%4d  %5.2f  ' % (c['cuadro'], c['t'])
    for l in lados:
        m = c[l]
        fila += '  (%5.2f,%5.2f,%5.2f)  %3d   %4.2f    %3d/%4d     %4.2f   ' % (*m['muneca_m'], m['codo_flexion'], m['alcance'], m['muneca_doblada'], m['supinacion'], m['vel_m_s'])
    if 'punta_m' in c:
        fila += '  (%5.2f,%5.2f,%5.2f)  (%5.2f,%5.2f,%5.2f)' % (*c['punta_m'], *c['filo'])
    print(fila)
print('\nAVISOS ANATOMICOS (%d):' % len(med['avisos']))
for aviso in med['avisos'] or ['ninguno']:
    print('  - ' + aviso)
if args.sin_vista:
    sys.exit(0)

# Que cuadros se ven: las poses clave y, entre ellas, los que hagan falta para no dejar huecos de mas de 3 cuadros.
if args.cada > 0:
    cuadros = ','.join(str(c) for c in sorted(set(range(0, n, args.cada)) | {n - 1} | {min(n - 1, round(k['t'] * 30)) for k in spec['claves']}))
elif args.cuadros == 'auto':
    claves = sorted({min(n - 1, round(k['t'] * 30)) for k in spec['claves']})
    elegidos = set(claves)
    for a, b in zip(claves, claves[1:]):
        pasos = max(1, round((b - a) / 3))
        elegidos.update(round(a + (b - a) * i / pasos) for i in range(1, pasos))
    cuadros = ','.join(str(c) for c in sorted(elegidos))
else:
    cuadros = args.cuadros
r = blender(PERSONAJES[args.personaje], 'gestos_vista.py', args.clip, args.trabajo, cuadros, RAIZ)
carpeta = os.path.join(args.trabajo, args.clip)
vista = json.load(open(os.path.join(carpeta, '_vista.json'), encoding='utf-8'))
if vista.get('status') != 'ok':
    print('ERROR en la vista previa:\n' + vista.get('err', r.stderr[-2000:]))
    sys.exit(1)

from PIL import Image, ImageDraw
lista = vista['cuadros']
vistas = ['frente', 'lado', 'juego', 'arriba']
for viejo in os.listdir(carpeta):
    if viejo.startswith('hoja_') and viejo.endswith('.jpg'):
        os.remove(os.path.join(carpeta, viejo))
hojas = []
for h in range(0, len(lista), COLUMNAS):
    grupo = lista[h:h + COLUMNAS]
    tiles = {(c, v): Image.open(os.path.join(carpeta, 'c%03d_%s.png' % (c, v))).convert('RGB') for c in grupo for v in vistas}
    w, hh = next(iter(tiles.values())).size
    hoja = Image.new('RGB', (w * len(grupo), hh * len(vistas)), 'white')
    d = ImageDraw.Draw(hoja)
    for i, c in enumerate(grupo):
        for j, v in enumerate(vistas):
            hoja.paste(tiles[(c, v)], (i * w, j * hh))
            d.rectangle([i * w, j * hh, i * w + 118, j * hh + 13], fill=(255, 255, 255))
            d.text((i * w + 3, j * hh + 1), 'c%d %.2fs %s' % (c, c / 30, v), fill=(0, 0, 0))
    ruta = os.path.join(carpeta, 'hoja_%d.jpg' % (len(hojas) + 1))
    hoja.save(ruta, quality=88)
    hojas.append(ruta)
print('\nVista previa sobre %s. Cuadros: %s' % (args.personaje, cuadros))
for ruta in hojas:
    print('  hoja: ' + ruta)
if 'detalle_cuadro' in vista:
    nombres = ['frente', 'lado', 'arriba', 'atras']
    imgs = [Image.open(os.path.join(carpeta, 'detalle_%s.png' % v)).convert('RGB') for v in nombres]
    w, hh = imgs[0].size
    det = Image.new('RGB', (w * len(imgs), hh), 'white')
    d = ImageDraw.Draw(det)
    for i, im in enumerate(imgs):
        det.paste(im, (i * w, 0))
        d.rectangle([i * w, 0, i * w + 150, 13], fill=(255, 255, 255))
        d.text((i * w + 3, 1), 'mano c%d desde %s' % (vista['detalle_cuadro'], nombres[i]), fill=(0, 0, 0))
    ruta = os.path.join(carpeta, 'detalle.jpg')
    det.save(ruta, quality=90)
    print('  detalle de la mano con el objeto: ' + ruta)
