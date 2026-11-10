# Exportacion por lotes (sincrona) de "Brillo en la montana": mapa nuevo + PNJ/criaturas a GLB Draco.
# Uso:
#   blender --background --python tools/blender/export_lote.py -- <reporte.json> [--solo mapa,tuneles,npcs] [--npc Ogro,Hada] [--guardar]
# - Mapa: abre Map.blend y exporta las colecciones cambiadas a public/models-3d/map (Draco 6).
# - Tuneles: mide TunelesEstructura con rayos y escribe la red y los colisionadores de cuboides para el motor.
# - PNJ: abre cada .blend, baja texturas a <= 1024 px, genera/retargetea sus animaciones y exporta con Draco.
# No guarda los .blend (todo se hace en memoria) salvo con --guardar, que escribe en cada .blend de PNJ solo sus
# animaciones nuevas y los nombres normalizados (Blender deja la version anterior como .blend1).
import bpy, sys, os, json, math, time, traceback
import numpy as np
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import glbtool

REPO = os.path.dirname(os.path.dirname(HERE))
MODELS = os.path.join(REPO, 'public', 'models-3d')
SRC = r'G:\Mi unidad\PROYECTO MEN\Modelos 3D'
MAP_BLEND = os.path.join(SRC, 'Mapa', 'Map.blend')
ANIMS_BLEND = os.path.join(SRC, 'Animaciones', 'Animaciones.blend')
ALDEANO_BLEND = os.path.join(SRC, 'PersonajesPrincipalesDesafios', 'Aldeano.blend')
MAXTEX = 1024

argv = sys.argv[sys.argv.index('--') + 1:]
REPORT = argv[0]
SOLO = set(argv[argv.index('--solo') + 1].split(',')) if '--solo' in argv else {'mapa', 'tuneles', 'npcs'}
SOLO_NPC = set(argv[argv.index('--npc') + 1].split(',')) if '--npc' in argv else None
# --guardar: deja en cada .blend de PNJ las acciones generadas (pistas NLA, una por clip) y guarda el archivo.
GUARDAR = '--guardar' in argv
rep = {"started": time.strftime('%H:%M:%S'), "map": {}, "npcs": {}, "errors": []}

DRACO = dict(export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
             export_draco_position_quantization=14, export_draco_normal_quantization=10,
             export_draco_texcoord_quantization=12, export_draco_color_quantization=10,
             export_draco_generic_quantization=12)


def gltf_kwargs(**kw):
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    dropped = sorted(k for k in kw if k not in props)
    if dropped:
        rep.setdefault("dropped_kwargs", sorted(set(rep.get("dropped_kwargs", [])) | set(dropped)))
    return {k: v for k, v in kw.items() if k in props}


def to_gltf(v):
    return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]


def summary(path):
    d = glbtool.describe(path)
    return {"bytes": os.path.getsize(path), "nodes": d["n_nodes"], "draco": all(m["draco"] for m in d["meshes"]) if d["meshes"] else None,
            "verts": sum(m["verts"] for m in d["meshes"]), "attrs": sorted({a for m in d["meshes"] for a in m["attrs"]}),
            "images": d["images"], "skins": d["skins"],
            "animations": [[a["name"], a["duration"], a["channels"]] for a in d["animations"]]}


# ---------------------------------------------------------------- texturas
def pixels(img):
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    return buf.reshape(h, w, 4)


def downscale(px, max_side):
    h, w = px.shape[:2]
    f = max(h, w) / max_side
    if f <= 1:
        return px
    if float(f).is_integer() and h % int(f) == 0 and w % int(f) == 0:
        f = int(f)
        return px.reshape(h // f, f, w // f, f, 4).mean(axis=(1, 3))
    nh, nw = max(1, round(h / f)), max(1, round(w / f))
    ys = np.minimum((np.arange(nh) + 0.5) * h / nh, h - 1).astype(int)
    xs = np.minimum((np.arange(nw) + 0.5) * w / nw, w - 1).astype(int)
    return px[ys][:, xs]


def shrink_textures(meshes):
    """Baja a MAXTEX las texturas de los materiales; devuelve (hay_alfa, detalle)."""
    any_alpha, done, info = False, {}, []
    for ob in meshes:
        for m in ob.data.materials:
            if not m or not m.node_tree:
                continue
            nt = m.node_tree
            for n in nt.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    s = n.inputs.get('Alpha')
                    if s and s.is_linked:
                        src = s.links[0].from_node
                        if src.type == 'TEX_IMAGE' and src.image and float(pixels(src.image)[..., 3].min()) >= 0.98:
                            for l in list(s.links):
                                nt.links.remove(l)
                        else:
                            any_alpha = True
            for n in nt.nodes:
                if n.type == 'TEX_IMAGE' and n.image and max(n.image.size) > MAXTEX:
                    img = n.image
                    if img.name not in done:
                        px = downscale(pixels(img), MAXTEX)
                        h, w = px.shape[:2]
                        new = bpy.data.images.new(img.name + '_s', w, h, alpha=True)
                        new.colorspace_settings.name = img.colorspace_settings.name
                        new.alpha_mode = img.alpha_mode
                        new.pixels.foreach_set(np.ascontiguousarray(px, dtype=np.float32).ravel())
                        done[img.name] = new
                        info.append([img.name, list(img.size), [w, h]])
                    n.image = done[img.name]
    return any_alpha, info


# ---------------------------------------------------------------- mapa
# (coleccion de Map.blend, destino relativo a public/models-3d/map, un GLB por objeto)
MAP_EXPORTS = [
    ('Terreno', 'Mapa/Terreno', True),
    ('Pinares', 'Mapa/Pinares.glb', False),
    ('Rocas', 'Mapa/Rocas.glb', False),
    ('LimitesJuego', 'Mapa/LimitesJuego', True),
    ('BosqueArboles', 'Desafio2/BosqueOscuridad/BosqueArboles.glb', False),
    ('BosqueHongos', 'Desafio2/BosqueOscuridad/BosqueHongos.glb', False),
    ('BosqueManzanas', 'Desafio2/BosqueOscuridad/BosqueManzanas.glb', False),
    ('PuebloMinero', 'Desafio3/PuebloMinero.glb', False),
    ('HedrigExterior', 'Desafio3/CasaDeHedrig/HedrigExterior.glb', False),
    ('HedrigInterior', 'Desafio3/CasaDeHedrig/HedrigInterior.glb', False),
    ('HedrigRecogibles', 'Desafio3/CasaDeHedrig/HedrigRecogibles', True),
    ('TunelesEstructura', 'Desafio3/TunelesCumbre/TunelesEstructura.glb', False),
    ('TunelesObjetos', 'Desafio3/TunelesCumbre/TunelesObjetos.glb', False),
    ('CumbreCamino', 'RelatoCierre/CumbreDesolacion/CumbreCamino.glb', False),
    ('CumbreColumnas', 'RelatoCierre/CumbreDesolacion/CumbreColumnas.glb', False),
    ('CumbreEdificios', 'RelatoCierre/CumbreDesolacion/CumbreEdificios.glb', False),
    ('CumbreJardines', 'RelatoCierre/CumbreDesolacion/CumbreJardines.glb', False),
    ('CumbreNieve', 'RelatoCierre/CumbreDesolacion/CumbreNieve.glb', False),
    ('CumbreMontanas', 'RelatoCierre/CumbreMontanas.glb', False),
    ('SantuarioExterior', 'RelatoCierre/Santuario/SantuarioExterior.glb', False),
    ('SantuarioInterior', 'RelatoCierre/Santuario/SantuarioInterior.glb', False),
    ('SantuarioCaliz', 'RelatoCierre/Santuario/SantuarioCaliz', True),
    ('ChozaExterior', 'Desafio1/ChozaEstatua/ChozaExterior.glb', False),
    ('ChozaInterior', 'Desafio1/ChozaEstatua/ChozaInterior.glb', False),
    ('ChozaRecogibles', 'Desafio1/ChozaEstatua/ChozaRecogibles', True),
    ('ClaroExterior', 'Desafio2/ClaroDelHada/ClaroExterior.glb', False),
    ('ClaroInteractivos', 'Desafio2/ClaroDelHada/ClaroInteractivos.glb', False),
    ('ClaroRecogibles', 'Desafio2/ClaroDelHada/ClaroRecogibles', True),
]


def unlock_layers(lc):
    lc.exclude = False
    lc.hide_viewport = False
    lc.collection.hide_viewport = False
    lc.collection.hide_select = False
    for c in lc.children:
        unlock_layers(c)


def select_only(objs):
    vl = bpy.context.view_layer
    for o in vl.objects:
        o.select_set(False)
    for o in objs:
        o.hide_select = False
        o.hide_viewport = False
        o.hide_set(False)
        o.select_set(True)
    vl.objects.active = objs[0]


def world_bbox(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    # glTF: (x, z, -y)
    return {"min": [round(lo.x, 3), round(lo.z, 3), round(-hi.y, 3)], "max": [round(hi.x, 3), round(hi.z, 3), round(-lo.y, 3)],
            "origin": to_gltf(o.matrix_world.translation)}


def export_map_glb(objs, dst, terrain=False):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    select_only(objs)
    kw = gltf_kwargs(filepath=dst, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                     export_animations=False, export_skins=False, export_morph=False, export_cameras=False, export_lights=False,
                     export_extras=False, export_materials='EXPORT', export_tangents=False,
                     export_image_format='AUTO', export_jpeg_quality=88,
                     export_vertex_color='ACTIVE' if terrain else 'MATERIAL', export_all_vertex_colors=terrain,
                     export_active_vertex_color_when_no_material=False, **DRACO)
    bpy.ops.export_scene.gltf(**kw)
    return summary(dst)


def build_tapas():
    """Tapas de los pozos del pantano hechas a medida de cada hueco del terreno: un abanico sobre el borde real del
    agujero, con las mismas UV del terreno en ese borde, asi cierran sin rendijas y la textura continua. Se crean en
    memoria (las tapas guardadas en Map.blend quedaron de antes de retocar el terreno)."""
    import bmesh
    terr = bpy.data.objects['Terreno']
    bm = bmesh.new()
    bm.from_mesh(terr.data)
    uv = bm.loops.layers.uv.active
    nxt, uvs, co = {}, {}, {}
    for e in bm.edges:
        if not e.is_boundary:
            continue
        l = e.link_loops[0]
        a, b = l.vert, l.link_loop_next.vert
        nxt[a.index] = b.index
        uvs[a.index] = l[uv].uv.copy()
        co[a.index] = terr.matrix_world @ a.co
    pozos = []
    for o in bpy.data.collections['PantanoPozos'].all_objects:
        if o.type == 'MESH':
            ps = [o.matrix_world @ v.co for v in o.data.vertices]
            pozos.append((o.name, sum(ps, Vector()) / len(ps)))
    mat = bpy.data.materials['TerrenoTapa']
    coll = bpy.data.collections.new('PantanoTapasNuevas')
    bpy.context.scene.collection.children.link(coll)
    seen, made = set(), {}
    for start in list(nxt):
        if start in seen:
            continue
        loop, cur = [], start
        while cur in nxt and cur not in seen:
            seen.add(cur)
            loop.append(cur)
            cur = nxt[cur]
        if cur != start or len(loop) < 3 or len(loop) > 400:
            continue
        pts = [co[i] for i in loop]
        c = sum(pts, Vector()) / len(pts)
        if max((p - c).length for p in pts) > 7:
            continue
        name, pc = min(pozos, key=lambda q: (q[1].x - c.x) ** 2 + (q[1].y - c.y) ** 2)
        if math.hypot(pc.x - c.x, pc.y - c.y) > 4 or name in made:
            continue
        n = len(loop)
        me = bpy.data.meshes.new(name + 'Tapa')
        # el terreno queda a la izquierda del borde a->b: la tapa (b, a, centro) mira hacia arriba
        me.from_pydata([tuple(p) for p in pts] + [tuple(c)], [], [((i + 1) % n, i, n) for i in range(n)])
        layer = me.uv_layers.new(name='UVMap')
        cuv = sum((uvs[i] for i in loop), Vector((0, 0))) / n
        vuv = [uvs[i] for i in loop] + [cuv]
        for poly in me.polygons:
            poly.use_smooth = True
            for li in poly.loop_indices:
                layer.data[li].uv = vuv[me.loops[li].vertex_index]
        for cname in ('Blanco', 'Mascaras'):
            col = me.color_attributes.new(cname, 'BYTE_COLOR', 'CORNER')
            col.data.foreach_set('color', [1.0] * (len(col.data) * 4))
        me.color_attributes.active_color = me.color_attributes['Blanco']
        me.color_attributes.render_color_index = 0
        me.materials.append(mat)
        me.update()
        ob = bpy.data.objects.new(name + 'Tapa', me)
        coll.objects.link(ob)
        made[name] = ob
    bm.free()
    return list(made.values()), len(pozos)


def export_map():
    bpy.ops.wm.open_mainfile(filepath=MAP_BLEND)
    unlock_layers(bpy.context.view_layer.layer_collection)
    out = rep["map"]
    out["bboxes"] = {}
    try:
        tapas, n_pozos = build_tapas()
        rel = 'Desafio1/PantanoTristeza/PantanoTapas.glb'
        out[rel] = export_map_glb(tapas, os.path.join(MODELS, 'map', rel.replace('/', os.sep)), terrain=True)
        out[rel]["objects"] = len(tapas)
        out[rel]["pozos"] = n_pozos
    except Exception:
        rep["errors"].append(['PantanoTapas', traceback.format_exc()])
    for coll_name, rel, per_object in MAP_EXPORTS:
        try:
            coll = bpy.data.collections[coll_name]
            objs = [o for o in coll.all_objects if o.type == 'MESH']
            for o in objs:
                out["bboxes"][o.name] = world_bbox(o)
            if coll_name == 'Terreno':
                # El motor multiplica el color base por COLOR_0: debe ser blanco y las mascaras de mezcla ir en COLOR_1,
                # como en el GLB anterior. En Map.blend solo quedan las mascaras: se antepone (en memoria) una capa blanca.
                for o in objs:
                    me = o.data
                    if len(me.color_attributes) == 1:
                        white = me.color_attributes.new('Blanco', 'BYTE_COLOR', 'CORNER')
                        white.data.foreach_set('color', [1.0] * (len(white.data) * 4))
                        me.color_attributes.active_color = white
                        me.color_attributes.render_color_index = list(me.color_attributes).index(white)
            if per_object:
                for o in objs:
                    dst = os.path.join(MODELS, 'map', rel.replace('/', os.sep), o.name + '.glb')
                    out[rel + '/' + o.name + '.glb'] = export_map_glb([o], dst, terrain=coll_name == 'Terreno')
            else:
                out[rel] = export_map_glb(objs, os.path.join(MODELS, 'map', rel.replace('/', os.sep)))
                out[rel]["objects"] = len(objs)
        except Exception:
            rep["errors"].append([coll_name, traceback.format_exc()])
    # GLB que no se re-exportan: avisar si quedaron viejos (origen o tamano de algun objeto distinto al de Map.blend).
    out["checks"] = {}
    done = {os.path.normpath(os.path.join(MODELS, 'map', k)) for k in out if k.endswith('.glb')}
    for root, _, files in os.walk(os.path.join(MODELS, 'map')):
        for fn in files:
            path = os.path.normpath(os.path.join(root, fn))
            if not fn.endswith('.glb') or path in done:
                continue
            try:
                js, _ = glbtool.read_glb(path)
                worst_o = worst_d = 0.0
                missing = []
                for n in js['nodes']:
                    o = bpy.data.objects.get(n.get('name', ''))
                    if o is None or o.type != 'MESH':
                        missing.append(n.get('name'))
                        continue
                    g = to_gltf(o.matrix_world.translation)
                    t = n.get('translation', [0, 0, 0])
                    worst_o = max(worst_o, max(abs(g[i] - t[i]) for i in range(3)))
                    if 'mesh' in n:
                        lo, hi = [1e9] * 3, [-1e9] * 3
                        for p in js['meshes'][n['mesh']]['primitives']:
                            acc = js['accessors'][p['attributes']['POSITION']]
                            lo = [min(lo[i], acc['min'][i]) for i in range(3)]
                            hi = [max(hi[i], acc['max'][i]) for i in range(3)]
                        bb = [Vector(c) for c in o.bound_box]
                        dim = [max(c[i] for c in bb) - min(c[i] for c in bb) for i in range(3)]
                        gd = [hi[0] - lo[0], hi[2] - lo[2], hi[1] - lo[1]]
                        worst_d = max(worst_d, max(abs(gd[i] - dim[i]) for i in range(3)))
                out["checks"][os.path.relpath(path, os.path.join(MODELS, 'map')).replace(os.sep, '/')] = {
                    "nodes": len(js['nodes']), "missing": missing[:5], "origin_delta_m": round(worst_o, 3), "size_delta_m": round(worst_d, 3)}
            except Exception:
                rep["errors"].append(['check ' + fn, traceback.format_exc()])


# ---------------------------------------------------------------- tuneles: red + colisionadores medidos con rayos
CELL = 0.4          # paso de la rejilla de suelo
STEP_UP, STEP_DOWN = 0.5, 0.7
LIMIT = 11.0        # no se mide mas lejos que esto de la red
SOLID = ['TunelGalerias', 'TunelPuente', 'TunelPlataformaOgro', 'TunelEscaleraSalida', 'TunelBocaEntrada', 'TunelBocaSalida',
         'TunelMesaPulso', 'TunelDerrumbes', 'TunelVagonetas', 'TunelCajasHongos', 'TunelBarriles', 'TunelRinconSimona', 'Terreno']


def seg_closest(p, a, b):
    d = b - a
    L2 = d.length_squared
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, (p - a).dot(d) / L2))
    return (p - (a + d * t)).length, t


def simplify(points, tol):
    """Douglas-Peucker en planta; points = [(x, y, z)]."""
    if len(points) < 3:
        return list(range(len(points)))
    keep = [0, len(points) - 1]
    stack = [(0, len(points) - 1)]
    while stack:
        i0, i1 = stack.pop()
        a, b = Vector(points[i0][:2]), Vector(points[i1][:2])
        worst, wi = 0.0, -1
        for i in range(i0 + 1, i1):
            d = seg_closest(Vector(points[i][:2]), a, b)[0]
            if d > worst:
                worst, wi = d, i
        if worst > tol:
            keep.append(wi)
            stack += [(i0, wi), (wi, i1)]
    return sorted(set(keep))


def tunnel_analysis():
    if bpy.data.filepath != MAP_BLEND:
        bpy.ops.wm.open_mainfile(filepath=MAP_BLEND)
    net = json.loads(bpy.data.texts['tuneles_red.json'].as_string())
    out = rep["tuneles"] = {}
    dg = bpy.context.evaluated_depsgraph_get()
    verts, polys, owner = [], [], []
    for name in SOLID:
        o = bpy.data.objects[name]
        me = o.evaluated_get(dg).to_mesh()
        mw = o.matrix_world
        base = len(verts)
        ws = [mw @ v.co for v in me.vertices]
        if name == 'Terreno':
            near = [95 < w.x < 168 and 135 < w.y < 200 for w in ws]
        verts += ws
        for p in me.polygons:
            if name == 'Terreno' and not any(near[i] for i in p.vertices):
                continue
            polys.append(tuple(base + i for i in p.vertices))
            owner.append(name)
        o.evaluated_get(dg).to_mesh_clear()
    bvh = BVHTree.FromPolygons(verts, polys, all_triangles=False)
    DOWN, UP = Vector((0, 0, -1)), Vector((0, 0, 1))

    # segmentos de la red (suelo)
    segs = []  # (edge, i, a, b, clear)
    for e in net['edges']:
        pl = [Vector(p) for p in e['floor_polyline_blender']]
        for i in range(len(pl) - 1):
            if (pl[i + 1] - pl[i]).length > 1e-4:
                segs.append((e['id'], i, pl[i], pl[i + 1], e.get('clear_height', 5.0)))

    def net_dist(p):
        best, bi = 1e9, -1
        for k, (_, _, a, b, _) in enumerate(segs):
            d = seg_closest(p, a, b)[0]
            if d < best:
                best, bi = d, k
        return best, bi

    def floor_at(x, y, z):
        loc, n, idx, _ = bvh.ray_cast(Vector((x, y, z + 1.0)), DOWN, 1.0 + STEP_DOWN + 0.8)
        if loc is None or abs(n.z) < 0.55:
            return None
        return loc.z, owner[idx]

    def blocked(a, b):
        for h in (0.9, 1.5):
            o = Vector((a[0], a[1], a[2] + h))
            d = Vector((b[0], b[1], b[2] + h)) - o
            L = d.length
            loc, _, _, _ = bvh.ray_cast(o, d / L, L)
            if loc is not None:
                return loc
        return None

    cells = {}  # (ix, iy, lev) -> dict

    def find(ix, iy, z):
        for lev in (int(math.floor(z / 1.5)) + k for k in (0, -1, 1)):
            c = cells.get((ix, iy, lev))
            if c and abs(c['z'] - z) < 1.0:
                return c
        return None

    def add(ix, iy, z, own):
        c = {'ix': ix, 'iy': iy, 'x': ix * CELL, 'y': iy * CELL, 'z': z, 'terrain': own == 'Terreno', 'walls': []}
        cells[(ix, iy, int(math.floor(z / 1.5)))] = c
        return c

    e0 = Vector(net['nodes'][0]['blender'])
    six, siy = round(e0.x / CELL) + 2, round(e0.y / CELL) - 2  # un poco dentro de la boca
    f = None
    for dx in range(0, 6):
        f = floor_at((six + dx) * CELL, (siy - dx) * CELL, e0.z + 0.5)
        if f and f[1] != 'Terreno':
            six, siy = six + dx, siy - dx
            break
    queue = [add(six, siy, f[0], f[1])]
    DIRS = [(1, 0), (0, 1), (-1, 0), (0, -1)]
    while queue:
        c = queue.pop()
        if c['terrain']:
            continue
        for d, (dx, dy) in enumerate(DIRS):
            ix, iy = c['ix'] + dx, c['iy'] + dy
            x, y = ix * CELL, iy * CELL
            f = floor_at(x, y, c['z'])
            ok = f is not None and -STEP_DOWN <= f[0] - c['z'] <= STEP_UP
            hit = None
            if ok:
                hit = blocked((c['x'], c['y'], c['z']), (x, y, f[0]))
                if hit is not None:
                    ok = False
            if ok and bvh.ray_cast(Vector((x, y, f[0] + 0.3)), UP, 1.5)[0] is not None:
                ok = False
            if not ok:
                mid = (c['x'] + dx * CELL / 2, c['y'] + dy * CELL / 2)
                c['walls'].append((d, (hit.x, hit.y) if hit is not None else mid))
                continue
            n = find(ix, iy, f[0])
            if n is None:
                if net_dist(Vector((x, y, f[0])))[0] > LIMIT:
                    continue  # borde del dominio: abierto
                queue.append(add(ix, iy, f[0], f[1]))
    tun = [c for c in cells.values() if not c['terrain']]
    out["cells"] = len(tun)
    out["terrain_cells"] = len(cells) - len(tun)
    # nodos alcanzados
    reach = {}
    for n in net['nodes']:
        p = Vector(n['blender'])
        best = min((Vector((c['x'], c['y'], c['z'])) - p).length for c in tun)
        reach[n['id']] = round(best, 2)
    out["node_reach_m"] = reach

    # ---- muros: cadenas de bordes
    edges = []
    CORN = {0: ((1, -1), (1, 1)), 1: ((1, 1), (-1, 1)), 2: ((-1, 1), (-1, -1)), 3: ((-1, -1), (1, -1))}
    for c in tun:
        for d, p in c['walls']:
            (ax, ay), (bx, by) = CORN[d]
            edges.append({'s': (2 * c['ix'] + ax, 2 * c['iy'] + ay), 'e': (2 * c['ix'] + bx, 2 * c['iy'] + by), 'z': c['z'], 'p': p, 'used': False})
    starts = {}
    for e in edges:
        starts.setdefault(e['s'], []).append(e)

    def next_of(e):
        cands = [n for n in starts.get(e['e'], []) if not n['used'] and abs(n['z'] - e['z']) < 1.0]
        return min(cands, key=lambda n: abs(n['z'] - e['z'])) if cands else None

    ends = {}
    for e in edges:
        ends.setdefault(e['e'], []).append(e)
    has_prev = lambda e: any(abs(n['z'] - e['z']) < 1.0 for n in ends.get(e['s'], []))
    chains = []
    for e in sorted(edges, key=lambda e: has_prev(e)):
        if e['used']:
            continue
        chain = []
        cur = e
        while cur is not None and not cur['used']:
            cur['used'] = True
            chain.append((cur['p'][0], cur['p'][1], cur['z']))
            cur = next_of(cur)
        chains.append(chain)
    walls = []
    for chain in chains:
        if len(chain) < 2:
            continue
        closed = (Vector(chain[0][:2]) - Vector(chain[-1][:2])).length < CELL * 1.6 and len(chain) > 3
        pts = chain + [chain[0]] if closed else chain
        if closed:  # partir el lazo en dos para simplificar
            half = len(pts) // 2
            idx = simplify(pts[:half + 1], 0.2)
            idx = idx + [half + i for i in simplify(pts[half:], 0.2)[1:]]
        else:
            idx = simplify(pts, 0.2)
        for i0, i1 in zip(idx, idx[1:]):
            a, b = pts[i0], pts[i1]
            if math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05:
                continue
            zs = [p[2] for p in pts[i0:i1 + 1]]
            walls.append([a[0], a[1], b[0], b[1], min(zs), max(zs)])
    out["wall_boxes"] = len(walls)

    # ---- suelo: una sola malla continua sobre las celdas medidas (como el terreno). Cada esquina de la rejilla toma la
    # altura media de las celdas que la comparten, asi las pendientes y los peldanos quedan como rampas lisas y el avatar
    # no tropieza; dos niveles que se cruzan en planta (una galeria bajo otra) no comparten esquina.
    CORNERS = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    clusters = {}
    cell_corners = []
    for c in sorted(tun, key=lambda c: c['z']):
        ids = []
        for dx, dy in CORNERS:
            key = (2 * c['ix'] + dx, 2 * c['iy'] + dy)
            lst = clusters.setdefault(key, [])
            for k, cl in enumerate(lst):
                if abs(cl[0] / cl[1] - c['z']) < 0.6:
                    cl[0] += c['z']
                    cl[1] += 1
                    ids.append((key, k))
                    break
            else:
                lst.append([c['z'], 1])
                ids.append((key, len(lst) - 1))
        cell_corners.append((c, ids))
    index, fverts = {}, []
    for key, lst in clusters.items():
        for k, (zsum, n) in enumerate(lst):
            index[(key, k)] = len(fverts)
            fverts.append((key[0] * CELL / 2, key[1] * CELL / 2, zsum / n))
    faces = [tuple(index[i] for i in ids) for _, ids in cell_corners]
    worst = max(abs(sum(fverts[index[i]][2] for i in ids) / 4 - c['z']) for c, ids in cell_corners)
    fme = bpy.data.meshes.new('TunelSueloColision')
    fme.from_pydata(fverts, [], faces)
    fme.update()
    fob = bpy.data.objects.new('TunelSueloColision', fme)
    bpy.context.scene.collection.objects.link(fob)
    out["floor_mesh"] = export_map_glb([fob], os.path.join(MODELS, 'map', 'Desafio3', 'TunelesCumbre', 'TunelesColision.glb'))
    out["floor_mesh"]["cells"] = len(faces)
    out["floor_fit_worst_m"] = round(worst, 3)

    # ---- salida para el motor (glTF: x, z, -y)
    r3 = lambda x: round(x, 3)
    wall_rows = [[r3(ax), r3(-ay), r3(bx), r3(-by), r3(z0), r3(z1)] for ax, ay, bx, by, z0, z1 in walls]
    ts = ("// GENERADO por tools/blender/export_lote.py (--solo tuneles) midiendo con rayos TunelesEstructura / TunelesObjetos\n"
          "// de Map.blend. No editar a mano: volver a generar tras cambiar los tuneles. Coordenadas glTF (x, y, z).\n"
          "// El suelo es la malla TunelSueloColision de TunelesColision.glb, generada en la misma pasada.\n\n"
          "// Muros (borde real de lo caminable, lo transitable queda a la izquierda de a->b): [ax, az, bx, bz, yMin, yMax].\n"
          "export const TUNEL_WALL_ROWS: readonly (readonly number[])[] = [\n%s,\n];\n") % ',\n'.join('  ' + json.dumps(r) for r in wall_rows)
    dst = os.path.join(REPO, 'src', 'game', 'challenges', 'desafio3', 'tunelesCumbre', 'tunelColliderData.ts')
    open(dst, 'w', encoding='utf-8', newline='\n').write(ts)
    out["collider_file"] = dst

    # red para el motor (regiones, brujula, espectro, ogro)
    nodes = {n['id']: {"kind": n['kind'], "label": n['label'], "p": to_gltf(n['blender'])} for n in net['nodes']}
    edges_ = [{"id": e['id'], "from": e['from'], "to": e['to'], "role": e['role'], "halfWidth": round(e['half_width'], 2),
               "clear": round(e.get('clear_height', 5.0), 2), "floor": [to_gltf(p) for p in e['floor_polyline_blender']]} for e in net['edges']]
    red = {"nodes": nodes, "edges": edges_, "trueRoute": net['true_route'], "milestones": net['milestones'], "exitPit": net['exit_pit'],
           "entrance": net['entrance'], "deadEnds": net['dead_ends']}
    out["red"] = red
    ts = ("// GENERADO por tools/blender/export_lote.py desde el texto `tuneles_red.json` de Map.blend (red del laberinto de\n"
          "// TunelesCumbre). No editar a mano. Coordenadas glTF (x, y, z); las polilineas van por el suelo de cada galeria.\n\n"
          "export type TunelNodeId = %s;\n"
          "export type TunelNode = { kind: 'entrance' | 'junction' | 'milestone' | 'exit' | 'deadend'; label: string; p: readonly [number, number, number] };\n"
          "export type TunelEdge = {\n  id: string;\n  from: TunelNodeId;\n  to: TunelNodeId;\n  role: 'true_route' | 'loop' | 'dead_end';\n"
          "  halfWidth: number;\n  clear: number;\n  floor: readonly (readonly [number, number, number])[];\n};\n\n"
          "export const TUNEL_NODES: Record<TunelNodeId, TunelNode> = %s;\n\n"
          "export const TUNEL_EDGES: readonly TunelEdge[] = %s;\n\n"
          "// Ruta verdadera de la boca de entrada (pueblo de Hedrig) a la salida en la Cumbre.\n"
          "export const TUNEL_TRUE_ROUTE: readonly TunelNodeId[] = %s;\n") % (
        ' | '.join("'%s'" % k for k in nodes), json.dumps(nodes, ensure_ascii=False, indent=2),
        '[\n' + ',\n'.join('  ' + json.dumps(e, ensure_ascii=False) for e in edges_) + ',\n]', json.dumps(net['true_route']))
    dst = os.path.join(REPO, 'src', 'game', 'world', 'tunelesRed.ts')
    open(dst, 'w', encoding='utf-8', newline='\n').write(ts)
    out["red_file"] = dst


# ---------------------------------------------------------------- PNJ: esqueletos, retarget y clips procedurales
Y = Vector((0, 1, 0))
UPZ = Vector((0, 0, 1))
MIX = 'mixamorig:'
MIX_ROLES = {r: MIX + r for r in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm',
                                  'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg', 'LeftShoulder', 'RightShoulder')}
HEDRIG_ROLES = {'Hips': 'hips', 'Spine': 'spine', 'Spine2': 'chest', 'Neck': 'neck', 'Head': 'head', 'LeftArm': 'upper_arm.L',
                'LeftForeArm': 'forearm.L', 'LeftHand': 'hand.L', 'RightArm': 'upper_arm.R', 'RightForeArm': 'forearm.R', 'RightHand': 'hand.R',
                'LeftUpLeg': 'thigh.L', 'LeftLeg': 'shin.L', 'RightUpLeg': 'thigh.R', 'RightLeg': 'shin.R'}


class Rig:
    def __init__(self, arm, roles):
        self.arm = arm
        self.roles = roles
        self.names = [b.name for b in arm.data.bones]
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
        self.R = {b.name: b.matrix_local.to_quaternion() for b in arm.data.bones}
        self.head = {b.name: b.head_local.copy() for b in arm.data.bones}
        self.L = {n: (self.R[self.parent[n]].inverted() @ self.R[n]) if self.parent[n] else self.R[n].copy() for n in self.names}
        # ejes del personaje en el espacio del esqueleto (el del Ogro viene girado 90 grados en X)
        self.up = (arm.matrix_world.to_3x3().inverted() @ UPZ).normalized()
        la, ra = self.head[roles['LeftArm']], self.head[roles['RightArm']]
        self.left = (la - ra)
        self.left -= self.up * self.left.dot(self.up)
        self.left.normalize()
        self.fwd = self.left.cross(self.up).normalized()
        self.hips = roles['Hips']
        self.hip_h = self.head[self.hips].dot(self.up)

    def bone(self, role):
        return self.roles[role]


def assign_action(arm, act):
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    # siempre se fija la ranura de la accion: al cambiar de accion Blender puede dejar la anterior y no animar nada
    if act is not None and hasattr(ad, 'action_suitable_slots') and len(ad.action_suitable_slots):
        ad.action_slot = ad.action_suitable_slots[0]


def clear_nla(arm):
    ad = arm.animation_data or arm.animation_data_create()
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)


def sample_basis(rig, action, frame):
    """Pose (rotacion y posicion locales de cada hueso) de una accion existente en un fotograma."""
    assign_action(rig.arm, action)
    bpy.context.scene.frame_set(int(frame))
    bpy.context.view_layer.update()
    out = {}
    for pb in rig.arm.pose.bones:
        loc, rot, _ = pb.matrix_basis.decompose()
        out[pb.name] = (rot.copy(), loc.copy())
    return out


def write_action(rig, name, frames, rots, locs):
    """rots: {hueso: [quat por fotograma]}, locs: {hueso: [Vector por fotograma]} -> accion nueva asignada al esqueleto."""
    arm = rig.arm
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    assign_action(arm, None)
    arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)
    for bname, qs in rots.items():
        pb = arm.pose.bones[bname]
        prev = None
        for f, q in zip(frames, qs):
            q = q.copy()
            if prev is not None and prev.dot(q) < 0:
                q.negate()
            prev = q
            # se respeta el modo de rotacion del hueso: las acciones que ya trae el .blend siguen valiendo
            if pb.rotation_mode == 'QUATERNION':
                pb.rotation_quaternion = q
                pb.keyframe_insert('rotation_quaternion', frame=f, group=bname)
            else:
                pb.rotation_euler = q.to_euler(pb.rotation_mode)
                pb.keyframe_insert('rotation_euler', frame=f, group=bname)
    for bname, ls in locs.items():
        pb = arm.pose.bones[bname]
        for f, l in zip(frames, ls):
            pb.location = l
            pb.keyframe_insert('location', frame=f, group=bname)
    return act


def retarget(rig, src_arm, src_action, name, max_samples=80):
    """Copia una accion de otro esqueleto igualando la direccion absoluta de cada hueso (sirve con reposos distintos)."""
    sc = bpy.context.scene
    f0, f1 = int(round(src_action.frame_range[0])), int(round(src_action.frame_range[1]))
    step = max(2, math.ceil((f1 - f0) / max_samples))
    src_frames = list(range(f0, f1, step)) + [f1]
    sR = {b.name: b.matrix_local.to_quaternion() for b in src_arm.data.bones}
    s_hips = MIX + 'Hips'
    s_hip_rest = src_arm.data.bones[s_hips].head_local.copy()
    k = rig.hip_h / s_hip_rest.z
    common = [n for n in rig.names if n in sR]
    A = {n: (rig.R[n] @ Y).rotation_difference(sR[n] @ Y) for n in common}
    assign_action(src_arm, src_action)
    sampled = []
    for f in src_frames:
        sc.frame_set(f)
        bpy.context.view_layer.update()
        sampled.append(({n: src_arm.pose.bones[n].matrix.to_quaternion() for n in common}, src_arm.pose.bones[s_hips].matrix.translation.copy()))
    assign_action(src_arm, None)
    rots = {n: [] for n in common}
    locs = {rig.hips: []}
    for Ws, hp in sampled:
        Wt = {}
        for n in rig.names:
            p = rig.parent[n]
            inherit = (Wt[p] @ rig.L[n]) if p else rig.R[n]
            if n in Ws:
                Wt[n] = (Ws[n] @ sR[n].inverted()) @ A[n] @ rig.R[n]
                rots[n].append(inherit.inverted() @ Wt[n])
            else:
                Wt[n] = inherit
        locs[rig.hips].append(rig.R[rig.hips].inverted() @ ((hp - s_hip_rest) * k))
    frames = [f - f0 for f in src_frames]
    return write_action(rig, name, frames, rots, locs)


def procedural(rig, name, seconds, fn, base=None, fps=24, step=2):
    """fn(t, w, rig) -> ({rol: [ops]}, desplazamiento de cadera en espacio del esqueleto). ops: ('rot', eje, rad) o
    ('aim', direccion, peso), en ejes del esqueleto y aplicadas sobre la pose base heredada."""
    n = int(round(seconds * fps / step))
    frames = [i * step for i in range(n + 1)]
    base = base or {}
    rots = {}
    locs = {rig.hips: []}
    role_of = {v: k for k, v in rig.roles.items()}
    for f in frames:
        t = (f / fps)
        w = 2 * math.pi * (f / (n * step))  # fase 0..2pi: el clip cierra en bucle
        ops, hip_shift = fn(t, w, rig)
        Wt = {}
        for b in rig.names:
            p = rig.parent[b]
            bq = base[b][0] if b in base else Quaternion()
            inherit = ((Wt[p] @ rig.L[b]) if p else rig.R[b]) @ bq
            cur = inherit
            for op in ops.get(role_of.get(b), []):
                if op[0] == 'rot':
                    cur = Quaternion(op[1], op[2]) @ cur
                else:
                    q = (cur @ Y).rotation_difference(Vector(op[1]).normalized())
                    cur = Quaternion().slerp(q, op[2]) @ cur
            Wt[b] = cur
            rest_inherit = (Wt[p] @ rig.L[b]) if p else rig.R[b]
            if b in base or role_of.get(b) in ops:
                rots.setdefault(b, []).append(rest_inherit.inverted() @ cur)
        base_loc = base[rig.hips][1] if rig.hips in base else Vector()
        locs[rig.hips].append(base_loc + rig.R[rig.hips].inverted() @ Vector(hip_shift))
    # huesos de la base con posicion propia (rig a medida de Hedrig)
    for b, (_, loc) in base.items():
        if b != rig.hips and loc.length > 1e-5:
            locs[b] = [loc.copy() for _ in frames]
    return write_action(rig, name, frames, rots, locs)


S = math.sin


def clip_flotar(t, w, r):  # espectro: flota persiguiendo con los brazos extendidos
    F, L, U = r.fwd, r.left, r.up
    ops = {
        'Spine': [('rot', L, math.radians(10 + 2 * S(w)))],
        'Spine2': [('rot', L, math.radians(6))],
        'Head': [('rot', L, math.radians(-14 + 3 * S(w + 1.0))), ('rot', U, math.radians(5 * S(w)))],
        'LeftArm': [('aim', F + L * 0.16 + U * (0.04 + 0.09 * S(w)), 1.0)],
        'RightArm': [('aim', F - L * 0.16 + U * (0.04 + 0.09 * S(w + 1.4)), 1.0)],
        'LeftForeArm': [('aim', F + L * 0.02 + U * (0.16 + 0.12 * S(w + 0.8)), 1.0)],
        'RightForeArm': [('aim', F - L * 0.02 + U * (0.16 + 0.12 * S(w + 2.2)), 1.0)],
        'LeftHand': [('aim', F - U * (0.25 + 0.15 * S(2 * w)), 1.0)],
        'RightHand': [('aim', F - U * (0.25 + 0.15 * S(2 * w + 1.0)), 1.0)],
        'LeftUpLeg': [('rot', L, math.radians(20 + 8 * S(w + 0.5)))],
        'RightUpLeg': [('rot', L, math.radians(24 + 8 * S(w + 1.7)))],
        'LeftLeg': [('rot', L, math.radians(14 + 8 * S(w + 1.5)))],
        'RightLeg': [('rot', L, math.radians(12 + 8 * S(w + 2.7)))],
    }
    return ops, U * (0.04 * r.hip_h * S(w)) + L * (0.03 * r.hip_h * S(w + 1.2))


def clip_alegria(t, w, r):  # nina clara: brinca con los brazos en alto
    F, L, U = r.fwd, r.left, r.up
    ops = {
        'Spine2': [('rot', L, math.radians(-5)), ('rot', U, math.radians(6 * S(w)))],
        'Head': [('rot', L, math.radians(-10))],
        'LeftArm': [('aim', L * (0.55 + 0.1 * S(2 * w)) + U * 0.85 + F * 0.1, 1.0)],
        'RightArm': [('aim', L * -(0.55 + 0.1 * S(2 * w)) + U * 0.85 + F * 0.1, 1.0)],
        'LeftForeArm': [('aim', U + L * (0.15 * S(2 * w)), 1.0)],
        'RightForeArm': [('aim', U - L * (0.15 * S(2 * w)), 1.0)],
    }
    return ops, U * (0.07 * r.hip_h * abs(S(w)))


def clip_pulso(t, w, r):  # ogro: fuerza en el pulso con el brazo derecho
    F, L, U = r.fwd, r.left, r.up
    push = 0.18 + 0.28 * S(w)
    ops = {
        'Spine': [('rot', L, math.radians(12 + 3 * S(2 * w)))],
        'Spine2': [('rot', U, math.radians(8 * S(w)))],
        'Head': [('rot', L, math.radians(-8))],
        'RightArm': [('aim', F * 0.75 - L * 0.3 - U * 0.45, 1.0)],
        'RightForeArm': [('aim', U * 0.9 + L * push + F * 0.15, 1.0)],
        'RightHand': [('aim', U * 0.9 + L * push, 1.0)],
        'LeftArm': [('aim', F * 0.5 + L * 0.5 - U * 0.6, 0.8)],
        'LeftForeArm': [('aim', F * 0.8 - L * 0.5 - U * 0.1, 0.8)],
    }
    return ops, U * (-0.03 * r.hip_h) + L * (0.02 * r.hip_h * S(w))


def clip_celebrar(t, w, r):  # ogro: celebra con los brazos arriba
    F, L, U = r.fwd, r.left, r.up
    ops = {
        'Spine2': [('rot', U, math.radians(10 * S(w))), ('rot', L, math.radians(-6))],
        'Head': [('rot', L, math.radians(-12))],
        'LeftArm': [('aim', L * 0.5 + U * 0.9, 1.0)],
        'RightArm': [('aim', L * -0.5 + U * 0.9, 1.0)],
        'LeftForeArm': [('aim', U + L * (0.25 * S(2 * w)), 1.0)],
        'RightForeArm': [('aim', U - L * (0.25 * S(2 * w)), 1.0)],
    }
    return ops, U * (0.06 * r.hip_h * abs(S(w)))


def clip_atrapada(t, w, r):  # hada: encogida y temblando entre las zarzas
    F, L, U = r.fwd, r.left, r.up
    sh = 0.05 * S(6 * w)
    ops = {
        'Spine': [('rot', L, math.radians(16))],
        'Spine2': [('rot', L, math.radians(10)), ('rot', U, math.radians(3 * S(3 * w)))],
        'Head': [('rot', L, math.radians(12 + 3 * S(2 * w)))],
        'LeftArm': [('aim', U * -0.8 + F * 0.45 + L * (0.15 + sh), 1.0)],
        'RightArm': [('aim', U * -0.8 + F * 0.45 - L * (0.15 + sh), 1.0)],
        'LeftForeArm': [('aim', U * 0.5 + F * 0.5 - L * 0.6, 1.0)],
        'RightForeArm': [('aim', U * 0.5 + F * 0.5 + L * 0.6, 1.0)],
        'LeftUpLeg': [('rot', L, math.radians(-30))],
        'RightUpLeg': [('rot', L, math.radians(-38))],
        'LeftLeg': [('rot', L, math.radians(60))],
        'RightLeg': [('rot', L, math.radians(72))],
    }
    return ops, U * (-0.12 * r.hip_h + 0.01 * r.hip_h * S(3 * w))


def clip_volar(t, w, r):  # hada: vuela inclinada hacia delante, brazos abiertos y piernas recogidas atras
    F, L, U = r.fwd, r.left, r.up
    flap = 0.12 * S(2 * w)
    ops = {
        'Spine': [('rot', L, math.radians(16 + 2 * S(w)))],
        'Spine2': [('rot', L, math.radians(8)), ('rot', U, math.radians(4 * S(w)))],
        'Head': [('rot', L, math.radians(-24 + 3 * S(w + 0.7)))],
        'LeftArm': [('aim', L * 0.8 - U * (0.3 + flap) - F * 0.35, 1.0)],
        'RightArm': [('aim', L * -0.8 - U * (0.3 + flap) - F * 0.35, 1.0)],
        'LeftForeArm': [('aim', L * 0.65 - U * (0.5 - flap) - F * 0.45, 1.0)],
        'RightForeArm': [('aim', L * -0.65 - U * (0.5 - flap) - F * 0.45, 1.0)],
        'LeftUpLeg': [('rot', L, math.radians(16 + 5 * S(w + 0.4)))],
        'RightUpLeg': [('rot', L, math.radians(22 + 5 * S(w + 1.6)))],
        'LeftLeg': [('rot', L, math.radians(18 + 8 * S(w + 1.2)))],
        'RightLeg': [('rot', L, math.radians(12 + 8 * S(w + 2.4)))],
    }
    return ops, U * (0.03 * r.hip_h * S(2 * w))


def clip_hablar(t, w, r):  # Hedrig: gesticula con la mano libre y asiente
    F, L, U = r.fwd, r.left, r.up
    ops = {
        'Spine2': [('rot', U, math.radians(4 * S(w)))],
        'Head': [('rot', L, math.radians(5 * S(2 * w))), ('rot', U, math.radians(7 * S(w + 0.6)))],
        'LeftArm': [('rot', L, math.radians(-18 - 8 * S(w)))],
        'LeftForeArm': [('aim', F * 0.75 + U * (0.45 + 0.25 * S(2 * w)) + L * (0.2 * S(w)), 0.85)],
    }
    return ops, U * 0


def append_source(blend, obj_name, action_names):
    with bpy.data.libraries.load(blend, link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n == obj_name]
        dst.actions = [n for n in src.actions if n in action_names]
    arm = dst.objects[0]
    bpy.context.scene.collection.objects.link(arm)
    clear_nla(arm)
    assign_action(arm, None)
    return arm, {a.name: a for a in dst.actions}


def female_source():
    arm, acts = append_source(ANIMS_BLEND, 'Avatar', ['IdleFemale', 'WalkingFemale'])
    return arm, acts


def build_nina_fantasma(rig, c):
    return [('Flotar', procedural(rig, 'Flotar', 3.0, clip_flotar))]


def build_nina_clara(rig, c):
    src, acts = female_source()
    idle = retarget(rig, src, acts['IdleFemale'], 'Idle')
    walk = retarget(rig, src, acts['WalkingFemale'], 'Walking')
    base = sample_basis(rig, idle, 0)
    return [('Idle', idle), ('Walking', walk), ('Alegria', procedural(rig, 'Alegria', 1.5, clip_alegria, base))]


def build_ogro(rig, c):
    idle, attack = bpy.data.actions['Idle'], bpy.data.actions['Attack']
    base = sample_basis(rig, idle, idle.frame_range[0])
    fps = bpy.context.scene.render.fps
    return [('Idle', idle), ('Attack', attack), ('Pulso', procedural(rig, 'Pulso', 1.6, clip_pulso, base, fps=fps)),
            ('Celebrar', procedural(rig, 'Celebrar', 1.2, clip_celebrar, base, fps=fps))]


def build_idle_talking(rig, c):
    src, acts = female_source()
    idle = retarget(rig, src, acts['IdleFemale'], 'Idle')
    src2, acts2 = append_source(ALDEANO_BLEND, 'Aldeano', ['Talking'])
    return [('Idle', idle), ('Talking', retarget(rig, src2, acts2['Talking'], 'Talking'))]


def build_hada(rig, c):
    src, acts = female_source()
    idle = retarget(rig, src, acts['IdleFemale'], 'Idle')
    base = sample_basis(rig, idle, 0)
    return [('Idle', idle), ('Atrapada', procedural(rig, 'Atrapada', 2.0, clip_atrapada, base)),
            ('Volar', procedural(rig, 'Volar', 1.6, clip_volar, base))]


def build_hedrig(rig, c):
    idle = bpy.data.actions['Idle']
    base = sample_basis(rig, idle, idle.frame_range[0])
    return [('Idle', idle), ('Talking', procedural(rig, 'Talking', 2.5, clip_hablar, base))]


# nombre -> (blend, carpeta destino, altura en metros, roles, constructor de clips)
NPCS = {
    'Hedrig': (r'PersonajesPrincipalesDesafios\Enana.blend', 'npcs', 1.32, HEDRIG_ROLES, build_hedrig),
    'NinaFantasma': (r'Enemigos\NinaFantasma.blend', 'enemies', 1.15, MIX_ROLES, build_nina_fantasma),
    'NinaClara': (r'Enemigos\NinaNormal.blend', 'npcs', 1.05, MIX_ROLES, build_nina_clara),
    # El Ogro mide 0.68 de pie en su .blend (su reposo esta tumbado y en segundo plano no se puede medir deformado).
    'Ogro': (r'Enemigos\Ogro.blend', 'enemies', 3.0, MIX_ROLES, build_ogro, 0.68),
    'Driada': (r'Enemigos\Driada.blend', 'npcs', 1.9, MIX_ROLES, build_idle_talking),
    'Hada': (r'PersonajesPrincipalesDesafios\Hada.blend', 'npcs', 0.75, MIX_ROLES, build_hada),
    'Aldeana': (r'PersonajesPrincipalesDesafios\Aldeana.blend', 'npcs', 1.62, MIX_ROLES, build_idle_talking),
}


def export_npc(name):
    blend, folder, height, roles, build = NPCS[name][:5]
    standing = NPCS[name][5] if len(NPCS[name]) > 5 else None
    r = rep["npcs"][name] = {"blend": blend}
    bpy.ops.wm.open_mainfile(filepath=os.path.join(SRC, blend))
    sc = bpy.context.scene
    arm = next(o for o in sc.objects if o.type == 'ARMATURE')
    meshes = [o for o in sc.objects if o.type == 'MESH' and o.parent == arm]
    arm.name = name
    if len(meshes) == 1:
        meshes[0].name = 'Body'
    originales = set(sc.objects)
    acciones_previas = set(bpy.data.actions)
    clear_nla(arm)
    r["arm_rot"] = [round(x, 4) for x in arm.rotation_euler]
    r["arm_scale_src"] = [round(x, 5) for x in arm.scale]
    r["fps"] = sc.render.fps
    rig = Rig(arm, roles)
    r["fwd"] = [round(x, 2) for x in rig.fwd]
    clips = build(rig, r)
    # altura real en la escala uniforme del esqueleto (la malla no se toca). Se mide con la malla deformada en el primer
    # fotograma de su primer clip: el reposo del Ogro esta tumbado y es la animacion la que lo pone de pie.
    act0 = clips[0][1]
    assign_action(arm, act0)
    sc.frame_set(int(round(act0.frame_range[0])))
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for m in meshes:
        ev = m.evaluated_get(dg)
        me = ev.to_mesh()
        zs += [(ev.matrix_world @ v.co).z for v in me.vertices]
        ev.to_mesh_clear()
    assign_action(arm, None)
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    # una pista NLA por clip: el exportador saca una animacion por pista
    ad = arm.animation_data
    for clip, act in clips:
        act.name = clip
        act.use_fake_user = True
        tr = ad.nla_tracks.new()
        tr.name = clip
        st = tr.strips.new(clip, int(round(act.frame_range[0])), act)
        if hasattr(st, 'action_suitable_slots') and getattr(st, 'action_slot', None) is None and len(st.action_suitable_slots):
            st.action_slot = st.action_suitable_slots[0]
    if GUARDAR:
        # Solo quedan en el archivo el personaje y sus clips: fuera los esqueletos y acciones de donde se retargeteo.
        keep = {act for _, act in clips}
        for o in [o for o in sc.objects if o not in originales]:
            bpy.data.objects.remove(o, do_unlink=True)
        for a in [a for a in bpy.data.actions if a not in keep and a not in acciones_previas]:
            bpy.data.actions.remove(a)
        for i, tr in enumerate(ad.nla_tracks):
            tr.mute = i > 0
        bpy.ops.wm.save_mainfile()
        r["guardado"] = bpy.data.filepath
        for tr in ad.nla_tracks:
            tr.mute = False
    if standing:
        k = height / standing
    else:
        k = height / (max(zs) - min(zs))
        arm.location.z -= min(zs) * k
    arm.scale = arm.scale * k
    r["scale"] = round(k, 5)
    any_alpha, r["textures"] = shrink_textures(meshes)
    dst = os.path.join(MODELS, folder, name + '.glb')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    select_only([arm] + meshes)
    kw = gltf_kwargs(filepath=dst, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                     export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=2,
                     export_anim_slide_to_zero=True, export_optimize_animation_size=True,
                     export_optimize_animation_keep_anim_armature=True, export_optimize_animation_keep_anim_object=False,
                     export_reset_pose_bones=True, export_skins=True, export_all_influences=False, export_def_bones=False,
                     export_morph=False, export_cameras=False, export_lights=False, export_extras=False,
                     export_image_format='AUTO' if any_alpha else 'JPEG', export_jpeg_quality=88,
                     export_materials='EXPORT', export_tangents=False, **DRACO)
    bpy.ops.export_scene.gltf(**kw)
    r.update(summary(dst))
    r["alpha"] = any_alpha
    r["out"] = os.path.relpath(dst, REPO)


# ---------------------------------------------------------------- principal
try:
    if 'mapa' in SOLO:
        export_map()
    if 'tuneles' in SOLO:
        try:
            tunnel_analysis()
        except Exception:
            rep["errors"].append(['tuneles', traceback.format_exc()])
    if 'npcs' in SOLO:
        for npc in NPCS:
            if SOLO_NPC and npc not in SOLO_NPC:
                continue
            try:
                export_npc(npc)
            except Exception:
                rep["errors"].append([npc, traceback.format_exc()])
    rep["status"] = "ok" if not rep["errors"] else "con_errores"
except Exception:
    rep["status"] = "error"
    rep["errors"].append(['fatal', traceback.format_exc()])
rep["finished"] = time.strftime('%H:%M:%S')
os.makedirs(os.path.dirname(os.path.abspath(REPORT)), exist_ok=True)
open(REPORT, "w", encoding="utf-8").write(json.dumps(rep, indent=1, default=str))
