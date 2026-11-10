# Modela el follaje de los arboles de la Cumbre para el final del juego (el mundo recuperado): copas de hojas sobre las
# ramas reales de CumbreArbolesCongelados, con algunas flores. Blender en segundo plano:
#
#   blender --background --python tools/blender/follaje_cumbre.py -- [--guardar]
#
# Crea el objeto y la coleccion "CumbreFollaje" (dentro de CumbreDesolacion) y exporta
# public/models-3d/map/RelatoCierre/CumbreDesolacion/CumbreFollaje.glb (Draco). Con --guardar deja el follaje en
# Map.blend, tras copiarlo a Map_respaldo_antes_follaje.blend. Repetirlo reemplaza el follaje anterior.
import bpy, bmesh, sys, os, math, random, shutil, json
import numpy as np
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
MAP_BLEND = r'G:\Mi unidad\PROYECTO MEN\Modelos 3D\Mapa\Map.blend'
DST = os.path.join(REPO, 'public', 'models-3d', 'map', 'RelatoCierre', 'CumbreDesolacion', 'CumbreFollaje.glb')
GUARDAR = '--guardar' in sys.argv
NOMBRE = 'CumbreFollaje'
ARBOLES = 'CumbreArbolesCongelados'
# Tamano de la rejilla que agrupa las ramas (m): una mata de hojas por celda ocupada de la parte alta del arbol.
CELDA = 1.15
MATERIALES = (('CumbreHojaMaterial', (0.115, 0.30, 0.07)), ('CumbreHojaClaraMaterial', (0.24, 0.50, 0.10)), ('CumbreFlorMaterial', (0.90, 0.56, 0.70)))
random.seed(1581)

bpy.ops.wm.open_mainfile(filepath=MAP_BLEND)
arboles = bpy.data.objects[ARBOLES]
pts = np.array([arboles.matrix_world @ v.co for v in arboles.data.vertices], dtype=np.float64)

# --- cada arbol: componentes conexas de la huella en planta (rejilla de 1 m)
huella = {}
for i, (x, y, z) in enumerate(pts):
    huella.setdefault((int(math.floor(x)), int(math.floor(y))), []).append(i)
pend = set(huella)
arboles_idx = []
while pend:
    c0 = pend.pop()
    pila, celdas = [c0], [c0]
    while pila:
        cx, cy = pila.pop()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (cx + dx, cy + dy)
                if n in pend:
                    pend.remove(n)
                    pila.append(n)
                    celdas.append(n)
    arboles_idx.append([i for c in celdas for i in huella[c]])

# --- una mata por celda de la mitad alta de cada arbol
matas = []
info = []
for idx in arboles_idx:
    p = pts[idx]
    z0, z1 = p[:, 2].min(), p[:, 2].max()
    alto = z1 - z0
    if alto < 1.5:
        continue  # tocones y ramas caidas: sin copa
    arriba = p[p[:, 2] > z0 + 0.42 * alto]
    celdas = {}
    for q in arriba:
        celdas.setdefault(tuple(np.floor(q / CELDA).astype(int)), []).append(q)
    for qs in celdas.values():
        c = np.mean(qs, axis=0)
        # mas grandes arriba y en el centro; las de las puntas, menudas
        r = random.uniform(0.62, 0.98) * (0.85 + 0.3 * (c[2] - z0) / alto)
        matas.append((Vector(c) + Vector((0, 0, 0.18 * r)), r))
    info.append({'alto': round(float(alto), 2), 'matas': len(celdas)})

# --- la malla: icosferas achatadas y deformadas (hojas en facetas), con una flor cada tanto
bm = bmesh.new()
for centro, r in matas:
    mat = 1 if random.random() < 0.32 else 0
    geo = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    giro = Euler((random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0, 6.28))).to_matrix().to_4x4()
    forma = Matrix.Diagonal((random.uniform(0.9, 1.2), random.uniform(0.9, 1.2), random.uniform(0.6, 0.8), 1))
    for v in geo['verts']:
        v.co = centro + (giro @ forma) @ (v.co * random.uniform(0.86, 1.14))
    for f in {f for v in geo['verts'] for f in v.link_faces}:
        f.material_index = mat
    if random.random() < 0.3:
        d = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(0.1, 1))).normalized()
        flor = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r * random.uniform(0.16, 0.24))
        for v in flor['verts']:
            v.co += centro + Vector((d.x * r, d.y * r, d.z * r * 0.7))
        for f in {f for v in flor['verts'] for f in v.link_faces}:
            f.material_index = 2

viejo = bpy.data.objects.get(NOMBRE)
if viejo:
    bpy.data.objects.remove(viejo, do_unlink=True)
me = bpy.data.meshes.new(NOMBRE)
bm.to_mesh(me)
bm.free()
for nombre, rgb in MATERIALES:
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Metallic'].default_value = 0
    m.diffuse_color = (*rgb, 1)
    me.materials.append(m)
for p in me.polygons:
    p.use_smooth = False
obj = bpy.data.objects.new(NOMBRE, me)

col = bpy.data.collections.get(NOMBRE) or bpy.data.collections.new(NOMBRE)
padre = bpy.data.collections.get('CumbreDesolacion') or bpy.data.collections.get('RelatoCierre') or bpy.context.scene.collection
if col.name not in padre.children:
    padre.children.link(col)
col.objects.link(obj)

# --- exportar (por la coleccion raiz mientras tanto: la suya puede estar oculta o excluida de la capa de vista)
raiz = bpy.context.scene.collection
raiz.objects.link(obj)
bpy.context.view_layer.update()
for o in bpy.context.view_layer.objects:
    o.select_set(False)
obj.hide_set(False)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
os.makedirs(os.path.dirname(DST), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=DST, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_animations=False,
                          export_skins=False, export_morph=False, export_cameras=False, export_lights=False, export_extras=False,
                          export_materials='EXPORT', export_tangents=False, export_draco_mesh_compression_enable=True,
                          export_draco_mesh_compression_level=6, export_draco_position_quantization=14, export_draco_normal_quantization=10)
raiz.objects.unlink(obj)
rep = {'arboles': len(info), 'matas': len(matas), 'vertices': len(me.vertices), 'caras': len(me.polygons), 'glb_kb': os.path.getsize(DST) // 1024,
       'coleccion_padre': padre.name, 'detalle': info}
if GUARDAR:
    respaldo = os.path.join(os.path.dirname(MAP_BLEND), 'Map_respaldo_antes_follaje.blend')
    if not os.path.exists(respaldo):
        shutil.copy2(MAP_BLEND, respaldo)
    bpy.ops.wm.save_mainfile()
    rep['guardado'] = MAP_BLEND
    rep['respaldo'] = respaldo
print('FOLLAJE', json.dumps(rep))
