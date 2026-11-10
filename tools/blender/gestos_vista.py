# Uso: blender --background <Personaje.blend> --python gestos_vista.py -- <Clip> <carpeta trabajo> <cuadros> [raiz repo]
#
# Vista previa de un gesto sobre un personaje real, sin abrir el juego: aplica la pose de cada cuadro que dejo
# gestos.py (<Clip>.pose.json), cuelga el objeto de la mano igual que lo hace el juego (AvatarGestures.tsx) y saca
# imagenes de frente, de lado y de tres cuartos. <cuadros> es una lista "0,4,8" o "todos". No guarda el .blend.
import bpy, sys, os, json, math, traceback
from mathutils import Matrix, Vector

a = sys.argv[sys.argv.index('--') + 1:]
CLIP, WORK, CUADROS = a[0], a[1], a[2]
ROOT = a[3] if len(a) > 3 else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gestos')
OUT = os.path.join(WORK, CLIP)
os.makedirs(OUT, exist_ok=True)
rep = {}

# (nombre, desde donde mira la camara): el personaje mira hacia -Y; su derecha es -X.
# 'juego' es como lo ve el jugador: la camara en tercera persona va detras y algo por encima del avatar.
VISTAS = [('frente', Vector((0.0, -1.0, 0.06))), ('lado', Vector((-1.0, 0.0, 0.05))), ('juego', Vector((0.22, 1.0, 0.38))), ('arriba', Vector((0.0, -0.12, 1.0)))]
ANCHO, ALTO = 280, 340


def orth(v, *against):
    v = v.copy()
    for o in against:
        v -= o * v.dot(o)
    return v.normalized()


try:
    spec = json.load(open(os.path.join(DIR, CLIP + '.json'), encoding='utf-8'))
    pose = json.load(open(os.path.join(WORK, CLIP + '.pose.json')))
    ejes = json.load(open(os.path.join(DIR, '_esqueleto.json'), encoding='utf-8'))
    sc = bpy.context.scene
    arm = bpy.data.objects['Avatar']
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.parent == arm]
    if arm.animation_data:
        arm.animation_data.action = None
        for t in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(t)
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    PB = {pb.name.split(':')[-1]: pb for pb in arm.pose.bones}
    hips_rest_local = PB['Hips'].location.copy()

    n = len(pose['cuadros'])
    cuadros = list(range(n)) if CUADROS == 'todos' else sorted({min(n - 1, max(0, int(c))) for c in CUADROS.split(',') if c.strip() != ''})

    def poner(frame):
        for name, q in pose['cuadros'][frame].items():
            pb = arm.pose.bones.get(name)
            if pb:
                pb.rotation_quaternion = q
        bpy.context.view_layer.update()

    # El objeto, colocado en la mano con la misma regla que el juego.
    objeto = spec.get('objeto') or {}
    piezas, item = [], None
    if objeto.get('modelo'):
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, objeto['modelo']))
        piezas = [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']
        bpy.context.view_layer.update()
        B2G = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))  # Blender -> coordenadas del GLB (Y arriba)
        originales = {o: o.matrix_world.copy() for o in piezas}
        pts = [B2G @ (originales[o] @ Vector(c)) for o in piezas for c in o.bound_box]
        lo = Vector(min(p[i] for p in pts) for i in range(3))
        hi = Vector(max(p[i] for p in pts) for i in range(3))
        size, centro = hi - lo, (lo + hi) / 2
        orden = sorted(range(3), key=lambda i: (-size[i], i))
        e = [Vector([1.0 if i == k else 0.0 for i in range(3)]) for k in orden]
        lado = 'izquierdo' if objeto.get('mano') == 'izquierda' else 'derecho'
        S = 'Left' if lado == 'izquierdo' else 'Right'
        hand = arm.data.bones['mixamorig:%sHand' % S]
        mid = arm.data.bones['mixamorig:%sHandMiddle1' % S]
        nud_pos = hand.matrix_local.to_3x3().inverted() @ (mid.head_local - hand.head_local)
        K = nud_pos.normalized()
        T = orth(Vector(ejes[lado]['filo']), K)
        P = orth(Vector(ejes[lado]['palma']), K, T)
        giro = math.radians(float(objeto.get('giro', 0)))
        # El lado largo del objeto va a lo largo del agarre ('filo': sale por el pulgar, como una espada), hacia los
        # nudillos (un guante) o hacia fuera de la palma; el segundo lado sigue al eje siguiente, girado `giro` grados.
        ejes_mano = {'filo': (T, K), 'nudillos': (K, P), 'palma': (P, T)}
        largo_eje, medio_eje = ejes_mano[objeto.get('hacia', 'filo')]
        largo_t = largo_eje * (-1.0 if objeto.get('invertir') else 1.0)
        medio_t = medio_eje * math.cos(giro) + largo_t.cross(medio_eje) * math.sin(giro)
        signo = 1.0 if e[0].cross(e[1]).dot(e[2]) > 0 else -1.0
        corto_t = largo_t.cross(medio_t) * signo
        R = Matrix((largo_t, medio_t, corto_t)).transposed() @ Matrix((e[0], e[1], e[2]))
        escala_hueso = arm.matrix_world.to_scale().x
        altura = (arm.matrix_world @ arm.data.bones['mixamorig:HeadTop_End'].head_local).z
        metros = (altura / 1.7) / escala_hueso
        largo_local = float(objeto.get('largo', 0.2)) * metros
        agarre = nud_pos * 0.8 + P * (0.3 * nud_pos.length)
        if objeto.get('agarre') == 'extremo':
            agarre = agarre + largo_eje * (largo_local / 2 - float(objeto.get('empunadura', 0.08)) * metros)
        desplazar = objeto.get('desplazar', [0, 0, 0])
        agarre = agarre + (T * desplazar[0] + K * desplazar[1] + P * desplazar[2]) * metros
        H = Matrix.Translation(agarre) @ R.to_4x4() @ Matrix.Scale(largo_local / max(size), 4) @ Matrix.Translation(-centro)
        item = {'pb': PB[S + 'Hand'], 'H': H, 'B2G': B2G, 'originales': originales, 'visible': objeto.get('visible', [0, 1e9])}
        rep['objeto'] = {'tamano_glb': [round(x, 3) for x in size], 'orden_ejes': orden}

    def poner_objeto(frame):
        if not item:
            return
        t = frame / pose['fps']
        ver = item['visible'][0] <= t <= item['visible'][1]
        for o in piezas:
            o.hide_render = not ver
            o.matrix_world = arm.matrix_world @ item['pb'].matrix @ item['H'] @ item['B2G'] @ item['originales'][o]

    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'TEXTURE'
    sc.display.shading.show_shadows = False
    sc.render.film_transparent = False
    if sc.world is None:
        sc.world = bpy.data.worlds.new('Vista')
    sc.world.color = (0.82, 0.84, 0.88)
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = ANCHO, ALTO, 100
    sc.render.image_settings.file_format = 'PNG'
    cam = bpy.data.objects.new('VistaCam', bpy.data.cameras.new('VistaCam'))
    sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    sc.camera = cam
    altura = (arm.matrix_world @ arm.data.bones['mixamorig:HeadTop_End'].head_local).z
    centro_cam = Vector((0, 0, altura * 0.56))
    cam.data.ortho_scale = altura * 1.55

    for frame in cuadros:
        poner(frame)
        poner_objeto(frame)
        for vista, d in VISTAS:
            d = d.normalized()
            cam.location = centro_cam + d * 10
            cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(OUT, 'c%03d_%s.png' % (frame, vista))
            bpy.ops.render.render(write_still=True)

    # De cerca, la mano con el objeto a mitad del tiempo en que lo sostiene: palma, dorso y desde arriba.
    if item:
        v0, v1 = item['visible']
        frame = min(n - 1, max(0, int(round((v0 + min(v1, (n - 1) / pose['fps'])) / 2 * pose['fps']))))
        detalle = objeto.get('detalle')
        if detalle is not None:
            frame = min(n - 1, max(0, int(detalle)))
        poner(frame)
        poner_objeto(frame)
        mano = arm.matrix_world @ item['pb'].head
        cam.data.ortho_scale = altura * 0.42
        sc.render.resolution_x = sc.render.resolution_y = 360
        for vista, d in (('frente', (0.15, -1, 0.2)), ('lado', (-1, -0.15, 0.2)), ('arriba', (-0.2, -0.35, 1)), ('atras', (0.3, 1, 0.25))):
            d = Vector(d).normalized()
            cam.location = mano + d * 10
            cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(OUT, 'detalle_%s.png' % vista)
            bpy.ops.render.render(write_still=True)
        rep['detalle_cuadro'] = frame
    rep['cuadros'] = cuadros
    rep['personaje'] = os.path.basename(bpy.data.filepath)
    rep['status'] = 'ok'
except Exception:
    rep['status'] = 'error'; rep['err'] = traceback.format_exc()
json.dump(rep, open(os.path.join(OUT, '_vista.json'), 'w', encoding='utf-8'), indent=1)
