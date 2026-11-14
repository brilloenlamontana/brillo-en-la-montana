# Huesos de tela para capas, faldas, abrigos y colas de los avatares (se usa desde export_avatar.py, en memoria).
#
# Los clips compartidos solo mueven los 65 huesos Mixamo. Aqui cada prenda recibe cadenas cortas de huesos propios
# (tela_<prenda>_<cadena>_<n>) que cuelgan del tronco y no tienen pista en ningun clip: en el juego las mueve un resorte
# que choca con piernas y brazos (src/game/player/cloth.ts). La descripcion de cada prenda esta en tela_modelos.py.
#
# Dos tipos de prenda:
#   cortina  tela que cuelga (capa, falda, faldon de abrigo). Las cadenas se reparten por angulo alrededor del cuerpo y
#            bajan desde `z_top` hasta el borde; cada vertice se pesa a las dos cadenas vecinas y a los dos huesos de su
#            altura.
#   cola     una sola cadena que sigue la pieza desde donde nace (colas, trenzas).
import bpy, math, heapq, json
from mathutils import Vector

B = 'mixamorig:'
PIERNAS = ('UpLeg', 'Leg', 'Foot', 'ToeBase')


def _islas(me):
    par = list(range(len(me.vertices)))

    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a
    for e in me.edges:
        a, b = find(e.vertices[0]), find(e.vertices[1])
        if a != b:
            par[a] = b
    comp = {}
    for v in me.vertices:
        comp.setdefault(find(v.index), set()).add(v.index)
    return list(comp.values())


def _dist_seg(p, a, b):
    d = b - a
    L2 = d.length_squared
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, (p - a).dot(d) / L2))
    return (p - (a + d * t)).length


def _segmentos(arm, nombres):
    out = []
    for lado in ('Left', 'Right'):
        for n in nombres:
            b = arm.data.bones.get(B + lado + n)
            if b:
                t = b.children[0].head_local if b.children else b.tail_local
                out.append((b.name, b.head_local.copy(), t.copy()))
    return out


def _hat(t, k, K):
    """Peso del hueso k (de K) a la altura t (0 arriba, K en el borde): 1 en medio de su tramo, mezcla con los vecinos."""
    c = k + 0.5
    if k == K - 1 and t >= c:
        return 1.0
    if k == 0 and t <= c:
        return 1.0
    return max(0.0, 1.0 - abs(t - c))


def _pesar(body, arm, pesos_tela, fundido):
    """pesos_tela: {vertice: (t, [(nombre de hueso, peso)])}. Arriba (t < fundido) se conserva parte del peso original."""
    grupos = {g.name: g for g in body.vertex_groups}
    for vi, (t, lista) in pesos_tela.items():
        keep = max(0.0, 1.0 - t / fundido) if fundido > 0 else 0.0
        v = body.data.vertices[vi]
        total = sum(g.weight for g in v.groups) or 1.0
        for g in list(v.groups):
            body.vertex_groups[g.group].add([vi], g.weight / total * keep, 'REPLACE')
        s = sum(w for _, w in lista) or 1.0
        for nombre, w in lista:
            if w <= 1e-4:
                continue
            if nombre not in grupos:
                grupos[nombre] = body.vertex_groups.new(name=nombre)
            grupos[nombre].add([vi], w / s * (1.0 - keep), 'REPLACE')


def _crear_huesos(arm, cadenas):
    """cadenas: [(nombre base, padre, [puntos])]. Crea un hueso por tramo, conectado al anterior."""
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    arm.hide_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones
    for base, padre, pts in cadenas:
        prev = eb[B + padre]
        for k in range(len(pts) - 1):
            b = eb.new('%s_%d' % (base, k))
            b.head = pts[k]
            b.tail = pts[k + 1]
            b.parent = prev
            b.use_connect = k > 0
            b.use_deform = True
            prev = b
    bpy.ops.object.mode_set(mode='OBJECT')


def _isla_de(me, islas, s):
    if s == 'ymax':
        vi = max(range(len(me.vertices)), key=lambda i: me.vertices[i].co.y)
    else:
        s = Vector(s)
        vi = min(range(len(me.vertices)), key=lambda i: (me.vertices[i].co - s).length_squared)
    return next(c for c in islas if vi in c)


def _cortina(arm, body, islas, g, nombre, usados=()):
    me = body.data
    hips = arm.data.bones[B + 'Hips'].head_local
    z_top = g['z_top']
    z_min = g.get('z_min', -1.0)
    piernas = _segmentos(arm, PIERNAS) if g.get('r_pierna') else []
    brazos = _segmentos(arm, ('Arm', 'ForeArm', 'Hand')) if g.get('r_brazo') else []
    cand = set()
    if g.get('semillas'):
        for s in g['semillas']:
            cand |= _isla_de(me, islas, s)
    else:
        cand = set(range(len(me.vertices)))
    V = []
    for i in cand:
        if i in usados:
            continue
        co = me.vertices[i].co
        if co.z > z_top or co.z < z_min:
            continue
        if piernas and min(_dist_seg(co, a, b) for _, a, b in piernas) < g['r_pierna']:
            continue
        if brazos and min(_dist_seg(co, a, b) for _, a, b in brazos) < g['r_brazo']:
            continue
        if g.get('y_min') is not None and co.y < g['y_min']:
            continue
        if g.get('r_min') and math.hypot(co.x, co.y - hips.y) < g['r_min']:
            continue
        V.append(i)
    if len(V) < 20:
        return None
    ang = {i: math.atan2(me.vertices[i].co.x, me.vertices[i].co.y - hips.y) for i in V}  # 0 = atras
    N, K = g['cadenas'], g['huesos']
    vuelta = g.get('sector', 'atras') == 'vuelta'
    if vuelta:
        centros = [-math.pi + i * 2 * math.pi / N for i in range(N)]  # con N par, una cadena justo en medio de la espalda
        paso = 2 * math.pi / N
    else:
        orden = sorted(ang.values())
        a0, a1 = orden[int(len(orden) * 0.03)], orden[int(len(orden) * 0.97) - 1]
        paso = (a1 - a0) / max(1, N - 1) if N > 1 else 1.0
        centros = [a0 + i * paso for i in range(N)] if N > 1 else [(a0 + a1) / 2]

    def dang(a, c):
        d = a - c
        if vuelta:
            d = (d + math.pi) % (2 * math.pi) - math.pi
        return d

    # cada cadena: su borde inferior y sus puntos
    cadenas, bordes = [], []
    for ci, c in enumerate(centros):
        mios = [i for i in V if abs(dang(ang[i], c)) <= paso * 0.6]
        if not mios:
            mios = sorted(V, key=lambda i: abs(dang(ang[i], c)))[:20]
        zb = sorted(me.vertices[i].co.z for i in mios)[max(0, int(len(mios) * 0.02))]
        zb = min(zb, z_top - 0.08)
        bordes.append(zb)
        seg = (z_top - zb) / K
        pts = []
        for k in range(K + 1):
            z = z_top - k * seg
            cerca = [me.vertices[i].co for i in mios if abs(me.vertices[i].co.z - z) < seg * 0.5]
            if cerca:
                p = Vector((sum(q.x for q in cerca) / len(cerca), sum(q.y for q in cerca) / len(cerca), z))
            elif pts:
                p = Vector((pts[-1].x, pts[-1].y, z))
            else:
                r = sum(math.hypot(me.vertices[i].co.x, me.vertices[i].co.y - hips.y) for i in mios) / len(mios)
                p = Vector((math.sin(c) * r, hips.y + math.cos(c) * r, z))
            pts.append(p)
        cadenas.append(('tela_%s_%d' % (nombre, ci), g['padre'], pts))
    _crear_huesos(arm, cadenas)

    pesos = {}
    for i in V:
        a = ang[i]
        z = me.vertices[i].co.z
        # las dos cadenas vecinas
        if N == 1:
            pares = [(0, 1.0)]
        else:
            d = [(abs(dang(a, c)), ci) for ci, c in enumerate(centros)]
            d.sort()
            (d0, c0), (d1, c1) = d[0], d[1]
            if d0 + d1 < 1e-6 or (not vuelta and (a <= centros[0] or a >= centros[-1])):
                pares = [(c0, 1.0)]
            else:
                pares = [(c0, d1 / (d0 + d1)), (c1, d0 / (d0 + d1))]
        lista = []
        tm = 0.0
        for ci, wc in pares:
            t = max(0.0, min(K, (z_top - z) / (z_top - bordes[ci]) * K))
            tm += t * wc
            for k in range(K):
                h = _hat(t, k, K)
                if h > 0:
                    lista.append(('tela_%s_%d_%d' % (nombre, ci, k), wc * h))
        pesos[i] = (tm, lista)
    _pesar(body, arm, pesos, g.get('fundido', 0.5))
    return {'tipo': g.get('tipo_sim', 'capa'), 'cadenas': N, 'huesos': K, 'vertices': len(V), 'verts': set(V)}


def _cola(arm, body, islas, g, nombre, usados=()):
    me = body.data
    padre = arm.data.bones[B + g['padre']]
    V = set()
    for s in g['semillas']:
        V |= _isla_de(me, islas, s)
    V -= set(usados)
    if g.get('y_min') is not None:  # la cola viene pegada al cuerpo: solo lo que queda por detras
        V = {i for i in V if me.vertices[i].co.y > g['y_min']}
    # distancia sobre la malla desde donde nace (los vertices mas cercanos al punto `raiz`, o al hueso padre)
    raiz = Vector(g['raiz']) if g.get('raiz') else padre.head_local
    orden = sorted(V, key=lambda i: (me.vertices[i].co - raiz).length_squared)
    ady = {i: [] for i in V}
    for e in me.edges:
        a, b = e.vertices
        if a in V and b in V:
            L = (me.vertices[a].co - me.vertices[b].co).length
            ady[a].append((b, L))
            ady[b].append((a, L))
    dist = {}
    heap = [(0.0, i) for i in orden[:max(4, len(orden) // 40)]]
    while heap:
        d, i = heapq.heappop(heap)
        if i in dist:
            continue
        dist[i] = d
        for j, L in ady[i]:
            if j not in dist:
                heapq.heappush(heap, (d + L, j))
    # piezas sueltas de la cola (puntas): toman la distancia del vertice ya medido mas cercano
    medidos = list(dist)
    for i in V:
        if i not in dist:
            j = min(medidos, key=lambda m: (me.vertices[m].co - me.vertices[i].co).length_squared)
            dist[i] = dist[j] + (me.vertices[j].co - me.vertices[i].co).length
    D = max(dist.values())
    K = g['huesos']
    ini = g.get('desde', 0.0) * D  # el arranque de la cola queda con el cuerpo
    pts = []
    for k in range(K + 1):
        d = ini + (D - ini) * k / K
        banda = (D - ini) / K * 0.35
        cerca = [me.vertices[i].co for i in V if abs(dist[i] - d) < banda] or [me.vertices[min(V, key=lambda i: abs(dist[i] - d))].co]
        pts.append(Vector((sum(q.x for q in cerca) / len(cerca), sum(q.y for q in cerca) / len(cerca), sum(q.z for q in cerca) / len(cerca))))
    _crear_huesos(arm, [('tela_%s_0' % nombre, g['padre'], pts)])
    pesos = {}
    for i in V:
        if dist[i] < ini - (D - ini) / K * 0.5:
            continue
        t = max(0.0, min(K, (dist[i] - ini) / (D - ini) * K))
        lista = [('tela_%s_0_%d' % (nombre, k), _hat(t, k, K)) for k in range(K) if _hat(t, k, K) > 0]
        pesos[i] = (t, lista)
    _pesar(body, arm, pesos, g.get('fundido', 0.5))
    return {'tipo': g.get('tipo_sim', 'cola'), 'cadenas': 1, 'huesos': K, 'vertices': len(pesos), 'verts': set(pesos)}


def _radios(arm, body, tela):
    """Grosor de cada tramo del cuerpo (para las capsulas contra las que choca la tela): la distancia al hueso dentro
    de la que esta la mayor parte de su piel."""
    me = body.data
    gname = {g.index: g.name for g in body.vertex_groups}
    limites = {'UpLeg': (0.055, 0.1), 'Leg': (0.04, 0.075), 'Foot': (0.04, 0.07), 'Arm': (0.035, 0.065), 'ForeArm': (0.03, 0.06), 'Hand': (0.03, 0.055)}
    por = {}
    for v in me.vertices:
        if v.index in tela or not v.groups:
            continue
        g = max(v.groups, key=lambda x: x.weight)
        if g.weight < 0.6:
            continue
        por.setdefault(gname[g.group], []).append(v.co)
    out = {}
    for clave, (lo, hi) in limites.items():
        vals = []
        for lado in ('Left', 'Right'):
            b = arm.data.bones.get(B + lado + clave)
            if not b or b.name not in por:
                continue
            t = b.children[0].head_local if b.children else b.tail_local
            d = sorted(_dist_seg(co, b.head_local, t) for co in por[b.name])
            vals.append(d[int(len(d) * 0.7)])
        out[clave] = round(max(lo, min(hi, sum(vals) / len(vals))) if vals else (lo + hi) / 2, 4)
    return out


def poner_tela(arm, body, prendas):
    """Crea los huesos y pesos de cada prenda y deja en el objeto Avatar la propiedad `tela` (JSON) que el juego lee del
    GLB: tipo de cada prenda y grosor de piernas y brazos."""
    if body.data.users > 1:
        body.data = body.data.copy()
    islas = _islas(body.data)
    info, tela = {}, set()
    for nombre, g in prendas.items():
        r = (_cola if g['tipo'] == 'cola' else _cortina)(arm, body, islas, g, nombre, tela)
        if r:
            tela |= r.pop('verts')
            info[nombre] = r
    datos = {'prendas': {n: r['tipo'] for n, r in info.items()}, 'radios': _radios(arm, body, tela)}
    arm['tela'] = json.dumps(datos)
    return {'prendas': info, 'radios': datos['radios']}
