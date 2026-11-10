# Alas del hada: localizar sus vertices en la malla, crear un hueso por ala y pesarlos (se usa desde export_lote.py).
#
# El modelo trae cuatro alas (dos grandes arriba, dos pequenas a la altura de la cintura) fundidas en la malla del
# cuerpo y pesadas a brazos y hombros. Un ala es una lamina fina y clara detras de la espalda: sus vertices se reconocen
# por eso (grosor, color de textura, posicion y lejania de los brazos), sin depender de como venian pesados.
import math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

B = 'mixamorig:'
GROSOR_MAX = 0.016      # una lamina: al otro lado hay cara a menos de esto
RADIO_BRAZO = 0.042     # mas cerca que esto del eje de un brazo es piel o manga
ALTURA_MIN = 0.5        # por debajo estan la falda y las piernas
CORTE = 0.755           # altura que separa las alas de arriba de las de abajo
ALAS = ('AlaSupIzq', 'AlaSupDer', 'AlaInfIzq', 'AlaInfDer')


def _dist_seg(p, a, b):
    d = b - a
    L2 = d.length_squared
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, (p - a).dot(d) / L2))
    return (p - (a + d * t)).length


def _colores(me):
    """Color medio de textura de cada vertice."""
    img = None
    for m in me.materials:
        if m and m.node_tree:
            img = next((n.image for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
            if img:
                break
    out = np.full((len(me.vertices), 3), 0.5)
    if img is None or not me.uv_layers.active:
        return out
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    uv = me.uv_layers.active.data
    acc = np.zeros((len(me.vertices), 3))
    cnt = np.zeros(len(me.vertices))
    for l in me.loops:
        u, v = uv[l.index].uv
        acc[l.vertex_index] += px[min(h - 1, max(0, int(v * h))), min(w - 1, max(0, int(u * w))), :3]
        cnt[l.vertex_index] += 1
    return acc / np.maximum(cnt, 1)[:, None]


def localizar(arm, body):
    """Devuelve {nombre de ala: [indices de vertice]} y la x del centro del cuerpo."""
    me = body.data
    bones = arm.data.bones
    cx = bones[B + 'Spine2'].head_local.x
    col = _colores(me)
    bvh = BVHTree.FromPolygons([v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
    brazos = []
    for side in ('Left', 'Right'):
        for a, b in (('Arm', 'ForeArm'), ('ForeArm', 'Hand'), ('Hand', 'HandMiddle1')):
            if (B + side + a) in bones and (B + side + b) in bones:
                brazos.append((bones[B + side + a].head_local.copy(), bones[B + side + b].head_local.copy()))
    alas = {n: [] for n in ALAS}
    finos = set()
    for v in me.vertices:
        x, y, z = v.co
        dx = x - cx
        if z < ALTURA_MIN or y < -0.03 or abs(dx) < 0.03:
            continue
        # piel o manga del brazo (el brazo cuelga por delante de la espalda; el ala pasa por detras del hombro)
        if y < 0.005 and any(_dist_seg(v.co, a, c) < RADIO_BRAZO for a, c in brazos):
            continue
        n = v.normal
        hit = bvh.ray_cast(v.co - n * 1e-4, -n, GROSOR_MAX)
        if hit[0] is None:
            continue
        r, g, b = col[v.index]
        lum = (r + g + b) / 3
        rubio = r > g * 1.12 and b < 0.3
        if not rubio:   # el pelo tambien es fino: nunca es ala
            finos.add(v.index)
        if lum < 0.3 or rubio:   # vestido oscuro o pelo rubio
            continue
        alas[('AlaSup' if z > CORTE else 'AlaInf') + ('Izq' if dx > 0 else 'Der')].append(v.index)
    # un ala es una pieza conexa: se queda el grupo conexo mayor de cada una y se le suman los vecinos sueltos
    vecinos = {}
    for e in me.edges:
        a, b = e.vertices
        vecinos.setdefault(a, []).append(b)
        vecinos.setdefault(b, []).append(a)
    for name, idx in alas.items():
        pend = set(idx)
        mejor = []
        while pend:
            s = pend.pop()
            comp, stack = [s], [s]
            while stack:
                c = stack.pop()
                for o in vecinos.get(c, []):
                    if o in pend:
                        pend.remove(o)
                        comp.append(o)
                        stack.append(o)
            if len(comp) > len(mejor):
                mejor = comp
        # hacia la raiz el ala se oscurece: se suman dos anillos de vecinos finos del mismo lado
        dentro = set(mejor)
        lado = 1 if name.endswith('Izq') else -1
        for _ in range(2):
            dentro |= {o for c in dentro for o in vecinos.get(c, []) if o in finos and (me.vertices[o].co.x - cx) * lado > 0.02}
        alas[name] = sorted(dentro)
    # un ala modelada como pieza suelta entra entera
    pend = set(range(len(me.vertices)))
    while pend:
        s0 = pend.pop()
        isla, stack = [s0], [s0]
        while stack:
            c = stack.pop()
            for o in vecinos.get(c, []):
                if o in pend:
                    pend.remove(o)
                    isla.append(o)
                    stack.append(o)
        if len(isla) > 400:
            continue
        dentro = set(isla) & {i for n in ALAS for i in alas[n]}
        if len(dentro) > 0.3 * len(isla):
            # puede traer las dos alas de un lado: cada vertice va a la de su altura
            for i in isla:
                co = me.vertices[i].co
                name = ('AlaSup' if co.z > CORTE else 'AlaInf') + ('Izq' if co.x - cx > 0 else 'Der')
                for n in ALAS:
                    if n != name and i in alas[n]:
                        alas[n].remove(i)
                if i not in alas[name]:
                    alas[name].append(i)
    # vetas interiores que el color dejo fuera: un vertice rodeado por el ala es del ala
    for name in ALAS:
        dentro = set(alas[name])
        for _ in range(4):
            borde = {o for c in dentro for o in vecinos.get(c, []) if o not in dentro}
            dentro |= {o for o in borde if sum(1 for q in vecinos[o] if q in dentro) >= 0.5 * len(vecinos[o])}
        alas[name] = sorted(dentro)
    # ningun vertice en dos alas
    visto = set()
    for name in ALAS:
        alas[name] = [i for i in alas[name] if i not in visto]
        visto |= set(alas[name])
    return alas, cx


def crear_huesos(arm, body, alas):
    """Un hueso por ala, hijo de Spine2, de la raiz del ala (su punto mas cercano a la columna) a su punta."""
    import bpy
    me = body.data
    spine = arm.data.bones[B + 'Spine2']
    raiz_ref = spine.head_local.copy()
    info = {}
    extremos = {}
    for name, idx in alas.items():
        if len(idx) < 8:
            continue
        pts = [me.vertices[i].co.copy() for i in idx]
        raiz = min(pts, key=lambda p: (p - raiz_ref).length)
        # la raiz es el promedio de los vertices mas cercanos a la columna; la punta, de los mas lejanos a la raiz
        cerca = sorted(pts, key=lambda p: (p - raiz_ref).length)[:max(3, len(pts) // 12)]
        raiz = sum(cerca, Vector()) / len(cerca)
        lejos = sorted(pts, key=lambda p: -(p - raiz).length)[:max(3, len(pts) // 12)]
        punta = sum(lejos, Vector()) / len(lejos)
        extremos[name] = (raiz, punta)
        info[name] = {"vertices": len(idx), "raiz": [round(x, 3) for x in raiz], "punta": [round(x, 3) for x in punta]}
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    arm.hide_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    for name, (raiz, punta) in extremos.items():
        if name in eb:
            eb.remove(eb[name])
        b = eb.new(name)
        b.head = raiz
        b.tail = punta
        b.parent = eb[B + 'Spine2']
        b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    # pesos: el ala entera a su hueso, con una transicion corta hacia la columna junto a la raiz
    spine_g = body.vertex_groups[B + 'Spine2']
    for name, (raiz, punta) in extremos.items():
        g = body.vertex_groups.get(name) or body.vertex_groups.new(name=name)
        largo = (punta - raiz).length
        for i in alas[name]:
            v = me.vertices[i]
            t = (v.co - raiz).dot(punta - raiz) / (largo * largo)
            w = max(0.0, min(1.0, t / 0.15))
            for vg in body.vertex_groups:
                if vg.index != g.index:
                    try:
                        vg.remove([i])
                    except RuntimeError:
                        pass
            g.add([i], w, 'REPLACE')
            if w < 0.999:
                spine_g.add([i], 1 - w, 'REPLACE')
    return info


def animar_alas(arm, action, aleteos, amplitud_grados, paso=1):
    """Anade a una accion el aleteo de las cuatro alas: barren adelante y atras alrededor del eje vertical del cuerpo,
    en espejo, las de abajo con menos recorrido y un poco de retraso. `aleteos` ciclos completos en toda la accion, asi
    el clip sigue cerrando en bucle."""
    from mathutils import Quaternion
    up = (arm.matrix_world.to_3x3().inverted() @ Vector((0, 0, 1))).normalized()
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = action
    if hasattr(ad, 'action_suitable_slots') and len(ad.action_suitable_slots):
        ad.action_slot = ad.action_suitable_slots[0]
    f0, f1 = int(round(action.frame_range[0])), int(round(action.frame_range[1]))
    hechas = []
    for name in ALAS:
        pb = arm.pose.bones.get(name)
        if pb is None:
            continue
        pb.rotation_mode = 'QUATERNION'
        rest = pb.bone.matrix_local.to_quaternion()
        signo = 1 if name.endswith('Izq') else -1
        baja = name.startswith('AlaInf')
        amp = math.radians(amplitud_grados) * (0.7 if baja else 1.0)
        fase = 0.6 if baja else 0.0
        prev = None
        for f in list(range(f0, f1, paso)) + [f1]:
            w = 2 * math.pi * aleteos * (f - f0) / max(1, f1 - f0)
            # giro alrededor del eje vertical del cuerpo, llevado al espacio del hueso
            q = rest.inverted() @ Quaternion(up, signo * amp * math.sin(w - fase)) @ rest
            if prev is not None and prev.dot(q) < 0:
                q.negate()
            prev = q
            pb.rotation_quaternion = q
            pb.keyframe_insert('rotation_quaternion', frame=f, group=name)
        pb.rotation_quaternion = (1, 0, 0, 0)
        hechas.append(name)
    ad.action = None
    return hechas


def quitar_astillas(body, largo=0.15):
    """Borra los vertices sueltos del escaneo que forman astillas: aquellos cuyas aristas son todas larguisimas (un pico
    que sale del cuerpo). Devuelve cuantos quito."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(body.data)
    malos = [v for v in bm.verts if v.link_edges and min(e.calc_length() for e in v.link_edges) > largo]
    n = len(malos)
    if n:
        bmesh.ops.delete(bm, geom=malos, context='VERTS')
        bm.to_mesh(body.data)
        body.data.update()
    bm.free()
    return n


def fijar_baculo(arm, body):
    """El baculo (una pieza suelta, larga y delgada) queda pesado por completo a la mano que lo sostiene: rigido y
    siempre en esa mano, haga lo que haga el resto del cuerpo. Devuelve lo que hizo, o None si no hay baculo."""
    me = body.data
    vecinos = {}
    for e in me.edges:
        a, b = e.vertices
        vecinos.setdefault(a, []).append(b)
        vecinos.setdefault(b, []).append(a)
    pend = set(range(len(me.vertices)))
    mejor = None
    while pend:
        s0 = pend.pop()
        comp, stack = [s0], [s0]
        while stack:
            c = stack.pop()
            for o in vecinos.get(c, []):
                if o in pend:
                    pend.remove(o)
                    comp.append(o)
                    stack.append(o)
        if len(comp) < 40:
            continue
        pts = np.array([me.vertices[i].co for i in comp])
        vals, vecs = np.linalg.eigh(np.cov((pts - pts.mean(0)).T))
        sd = np.sqrt(np.maximum(vals, 0))[::-1]
        largo = float(np.ptp(pts @ vecs[:, -1]))
        if largo > 0.45 and sd[1] / sd[0] < 0.12 and (mejor is None or largo > mejor[1]):
            mejor = (comp, largo)
    if mejor is None:
        return None
    comp, largo = mejor
    manos = [arm.data.bones[B + s + 'Hand'] for s in ('Left', 'Right') if (B + s + 'Hand') in arm.data.bones and (B + s + 'Hand') in body.vertex_groups]
    if not manos:
        return None
    mano = min(manos, key=lambda b: min((me.vertices[i].co - b.head_local).length for i in comp))
    g = body.vertex_groups[mano.name]
    for vg in body.vertex_groups:
        if vg.index != g.index:
            vg.remove(comp)
    g.add(comp, 1.0, 'REPLACE')
    global ULTIMO_BACULO
    ULTIMO_BACULO = (comp, mano.name)
    return {"vertices": len(comp), "largo": round(largo, 3), "mano": mano.name}


# (indices de los vertices del baculo, hueso de la mano) de la ultima llamada a fijar_baculo
ULTIMO_BACULO = None


def hueso_baculo(arm, body, comp, nombre='Baculo'):
    """El baculo con hueso propio y sin padre: no lo arrastra ningun gesto del cuerpo, asi que queda plantado y derecho;
    es la mano la que se ancla a el (anclar_mano en export_lote.py) y, si un clip lo levanta, van los dos juntos."""
    import bpy
    pts = np.array([body.data.vertices[i].co for i in comp])
    centro = pts.mean(0)
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    arm.hide_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    b = eb.get(nombre) or eb.new(nombre)
    b.parent = None
    b.head = (centro[0], centro[1], float(pts[:, 2].min()))
    b.tail = (centro[0], centro[1], float(pts[:, 2].max()))
    b.roll = 0
    b.use_deform = True
    bpy.ops.object.mode_set(mode='OBJECT')
    g = body.vertex_groups.get(nombre) or body.vertex_groups.new(name=nombre)
    for vg in body.vertex_groups:
        if vg.index != g.index:
            vg.remove(comp)
    g.add(comp, 1.0, 'REPLACE')
    return nombre


def centro_baculo(body, comp, z, margen=0.03):
    """Centro del baculo (vertical) a la altura z, en el espacio de la malla."""
    pts = np.array([body.data.vertices[i].co for i in comp])
    cerca = pts[np.abs(pts[:, 2] - z) < margen]
    return Vector((cerca if len(cerca) else pts).mean(0))


def colocar_baculo(body, comp, z, xy):
    """Mueve el baculo en horizontal para que a la altura z pase por xy (el agarre). Es absoluto: repetirlo no lo
    desplaza otra vez. Devuelve cuanto se movio."""
    c = centro_baculo(body, comp, z)
    d = Vector((xy[0] - c.x, xy[1] - c.y, 0))
    if d.length > 1e-4:
        for i in comp:
            body.data.vertices[i].co += d
        body.data.update()
    return [round(x, 3) for x in d]


def agarre(arm, body, comp, mano, z, giro_mano=((-0.25, -0.95, -0.1), (0, 0, 1)), curl=(62, 55, 45)):
    """Como tiene que quedar la mano `mano` para empunar el baculo a la altura z: devuelve (desplazamiento, giro) de la
    mano respecto al reposo y {hueso de dedo: (eje, angulo)} para cerrar los dedos alrededor. giro_mano = hacia donde
    apuntan los nudillos y hacia donde va el pulgar (el baculo es vertical: la palma lo abraza de lado)."""
    from mathutils import Matrix
    B = arm.data.bones
    lado = 'Left' if 'Left' in mano else 'Right'
    pre = mano  # p. ej. mixamorig:LeftHand
    cab = lambda n: B[pre + n].head_local
    h0 = (cab('Middle1') - cab('')).normalized()
    a0 = cab('Index1') - cab('Pinky1')
    a0 = (a0 - h0 * a0.dot(h0)).normalized()
    n0 = h0.cross(a0) if lado == 'Left' else a0.cross(h0)  # normal de la palma
    h1 = Vector(giro_mano[0]).normalized()
    a1 = Vector(giro_mano[1])
    a1 = (a1 - h1 * a1.dot(h1)).normalized()
    n1 = h1.cross(a1) if lado == 'Left' else a1.cross(h1)
    M0 = Matrix((h0, a0, n0)).transposed()
    M1 = Matrix((h1, a1, n1)).transposed()
    giro = (M1 @ M0.transposed()).to_quaternion()
    pts = np.array([body.data.vertices[i].co for i in comp])
    cerca = pts[np.abs(pts[:, 2] - z) < 0.03]
    radio = float(np.linalg.norm(cerca[:, :2] - cerca[:, :2].mean(0), axis=1).max()) if len(cerca) else 0.01
    palma = h0 * (cab('Middle1') - cab('')).length * 0.8 + n0 * (radio + 0.006)  # del hueso de la mano al eje del baculo
    c = centro_baculo(body, comp, z)
    destino = Vector((c.x, c.y, z)) - giro @ palma
    eje = -a1 if lado == 'Left' else a1  # cerrar los dedos: de los nudillos hacia la palma
    dedos = {}
    for dedo in ('Index', 'Middle', 'Ring', 'Pinky'):
        for i, ang in enumerate(curl, 1):
            dedos[pre + dedo + str(i)] = (eje, math.radians(ang))
    for i, ang in enumerate((20, 30, 25), 1):  # el pulgar cierra por el otro lado
        dedos[pre + 'Thumb' + str(i)] = (-eje, math.radians(ang))
    return destino - cab(''), giro, dedos, radio
