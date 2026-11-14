# Mide en un avatar exportado (GLB) cuanto atraviesan piernas y manos la tela que cuelga, al caminar y al correr,
# y saca una imagen del peor fotograma de la carrera.
# blender --background --factory-startup --python capas.py -- <avatar.glb> <Walking.glb> <Running.glb> <reporte.json> <imagen.png>
import bpy, sys, json, math, traceback
from mathutils import Vector
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index('--') + 1:]
AV, WALK, RUN, REP, IMG = a
rep = {}


def base(name):
    return name.replace('mixamorig:', '').replace('mixamorig', '')


def importar(path):
    antes = set(bpy.data.objects)
    acc = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in antes], [x for x in bpy.data.actions if x not in acc]


def asignar(arm, act):
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    if act is not None and hasattr(act, 'slots') and len(act.slots):
        try:
            ad.action_slot = (ad.action_suitable_slots[0] if len(ad.action_suitable_slots) else act.slots[0])
        except Exception as e:
            rep.setdefault('slot_err', str(e))


try:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    objs, _ = importar(AV)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    meshes = [o for o in objs if o.type == 'MESH' and len(o.vertex_groups)]
    rep['huesos'] = len(arm.data.bones)
    rep['huesos_extra'] = [b.name for b in arm.data.bones if not b.name.startswith('mixamorig')]
    rep['mallas'] = [{'nombre': m.name, 'vertices': len(m.data.vertices), 'materiales': [s.material.name for s in m.material_slots if s.material]} for m in meshes]
    clips = {}
    ANIMS = r'G:\Mi unidad\PROYECTO MEN\Modelos 3D\Animaciones\Animaciones.blend'
    with bpy.data.libraries.load(ANIMS, link=False) as (src, dst):
        dst.actions = [n for n in src.actions if n in (WALK, RUN)]
    for act in dst.actions:
        clips['Walking' if act.name.startswith(WALK) else 'Running'] = act
    sc.render.fps = 30

    bones = {base(b.name): b for b in arm.data.bones}
    hip_z = bones['Hips'].head_local.z
    PIERNA = ('UpLeg', 'Leg', 'Foot', 'ToeBase')
    BRAZO = ('ForeArm', 'Hand')
    TRONCO = ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head')

    def clase(nombre):
        n = base(nombre).replace('Left', '').replace('Right', '')
        if n in TRONCO: return 'tronco'
        if n in PIERNA: return 'pierna'
        if n in BRAZO or n.startswith('Hand'): return 'mano'
        if n in ('Arm', 'Shoulder'): return 'brazo'
        return 'otro'

    def segs(nombres):
        out = []
        for lado in ('Left', 'Right'):
            for n in nombres:
                b = bones.get(lado + n)
                if b:
                    t = b.children[0].head_local if b.children else b.tail_local
                    out.append((b.head_local.copy(), t.copy()))
        return out

    def dist_seg(p, s):
        A, B = s
        d = B - A
        t = max(0.0, min(1.0, (p - A).dot(d) / (d.length_squared or 1)))
        return (p - (A + d * t)).length

    limbs = segs(('UpLeg', 'Leg', 'Foot', 'Arm', 'ForeArm', 'Hand'))

    # clasificar vertices por su hueso dominante, en reposo
    info = []  # por malla: (clase dominante por vertice, es tela que cuelga)
    resumen = {'tela_vertices': 0, 'tela_bajo_cadera': 0, 'tela_z_min': 9, 'tela_atras_max': 0, 'tela_ancho_max': 0, 'tela_peso': {}}
    for m in meshes:
        gname = {g.index: g.name for g in m.vertex_groups}
        cls, tela = [], []
        for v in m.data.vertices:
            w = {}
            for g in v.groups:
                c = clase(gname.get(g.group, ''))
                w[c] = w.get(c, 0) + g.weight
            dom = max(w, key=w.get) if w else 'otro'
            co = v.co
            lejos = min(dist_seg(co, s) for s in limbs) > 0.07 and dom == 'tronco'
            fuera = (co.x / 0.2) ** 2 + (co.y / 0.13) ** 2 > 1
            t = lejos and fuera and co.z < bones['Spine2'].head_local.z + 0.12
            cls.append(dom); tela.append(t)
            if t:
                resumen['tela_vertices'] += 1
                resumen['tela_peso'][dom] = resumen['tela_peso'].get(dom, 0) + 1
                if co.z < hip_z: resumen['tela_bajo_cadera'] += 1
                resumen['tela_z_min'] = min(resumen['tela_z_min'], co.z)
                resumen['tela_atras_max'] = max(resumen['tela_atras_max'], co.y)
                resumen['tela_ancho_max'] = max(resumen['tela_ancho_max'], abs(co.x))
        info.append((cls, tela))
    for k in ('tela_z_min', 'tela_atras_max', 'tela_ancho_max'):
        resumen[k] = round(resumen[k], 3)
    rep['reposo'] = resumen
    rep['cadera_z'] = round(hip_z, 3)

    dg = bpy.context.evaluated_depsgraph_get

    def medir(frame):
        sc.frame_set(frame)
        d = dg()
        vs, tris, limb_pts = [], [], []
        for m, (cls, tela) in zip(meshes, info):
            ev = m.evaluated_get(d)
            me = ev.to_mesh()
            mw = ev.matrix_world
            off = len(vs)
            cos = [mw @ v.co for v in me.vertices]
            vs.extend(cos)
            me.calc_loop_triangles()
            for t in me.loop_triangles:
                if all(tela[i] for i in t.vertices):
                    tris.append(tuple(off + i for i in t.vertices))
            for i, c in enumerate(cls):
                if c in ('pierna', 'mano') and not tela[i]:
                    limb_pts.append((c, cos[i]))
            ev.to_mesh_clear()
        if not tris:
            return {'pierna': (0, 0, 0), 'mano': (0, 0, 0)}
        bvh = BVHTree.FromPolygons(vs, tris)
        hips = arm.matrix_world @ arm.pose.bones[bones['Hips'].name].head
        sh = {l: arm.matrix_world @ arm.pose.bones[bones[l + 'Arm'].name].head for l in ('Left', 'Right')}
        out = {}
        for c in ('pierna', 'mano'):
            n = fuera = 0
            prof = 0.0
            for cc, p in limb_pts:
                if cc != c: continue
                n += 1
                if c == 'pierna':
                    o = Vector((hips.x, hips.y, p.z))
                else:
                    o = sh['Left'] if (p - sh['Left']).length < (p - sh['Right']).length else sh['Right']
                dvec = p - o
                L = dvec.length
                if L < 1e-4: continue
                hit = bvh.ray_cast(o, dvec / L, L)
                if hit[0] is not None:
                    fuera += 1
                    prof = max(prof, L - hit[3])
            out[c] = (n, fuera, prof)
        return out

    peor = (0, None, None)
    for nombre, act in clips.items():
        asignar(arm, act)
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        r = {'pierna': {'pct_max': 0, 'pct_medio': 0, 'prof_max': 0}, 'mano': {'pct_max': 0, 'pct_medio': 0, 'prof_max': 0}}
        frames = list(range(f0, f1 + 1, max(1, (f1 - f0) // 16)))
        for f in frames:
            mm = medir(f)
            for c in r:
                n, fu, pr = mm[c]
                pct = 100 * fu / n if n else 0
                r[c]['pct_medio'] += pct / len(frames)
                r[c]['pct_max'] = max(r[c]['pct_max'], pct)
                r[c]['prof_max'] = max(r[c]['prof_max'], pr)
            total = (mm['pierna'][1] + mm['mano'][1])
            if nombre == 'Running' and total >= peor[0]:
                peor = (total, f, act)
        for c in r:
            for k in r[c]: r[c][k] = round(r[c][k], 3 if k == 'prof_max' else 1)
        rep[nombre] = r

    # imagen: dos vistas (atras 3/4 y de lado) del peor fotograma de la carrera
    asignar(arm, peor[2] or clips['Running'])
    sc.frame_set(peor[1] or 1)
    rep['fotograma_imagen'] = peor[1]
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_cavity = True
    sc.render.resolution_x, sc.render.resolution_y = 520, 640
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.6, 0.62, 0.66)
    H = 2 * hip_z * arm.scale.z
    for i, (ang, nombre) in enumerate(((150, 'atras'), (90, 'lado'))):
        cam = bpy.data.objects.new('cam%d' % i, bpy.data.cameras.new('cam%d' % i))
        sc.collection.objects.link(cam)
        r = math.radians(ang)
        d = H * 1.75
        cam.location = (math.sin(r) * d, -math.cos(r) * d, H * 0.55)
        direction = Vector((0, 0, H * 0.45)) - cam.location
        cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = IMG.replace('.png', '_%s.png' % nombre)
        bpy.ops.render.render(write_still=True)
    rep['pose_ok'] = round((arm.pose.bones[bones['LeftUpLeg'].name].matrix.to_quaternion().rotation_difference(bones['LeftUpLeg'].matrix_local.to_quaternion()).angle), 3)
    rep['status'] = 'ok'
except Exception:
    rep['status'] = 'error'; rep['err'] = traceback.format_exc()
open(REP, 'w', encoding='utf-8').write(json.dumps(rep, indent=1, default=str))
