# Correccion de pesos de capas, colas y faldones en los avatares (se usa desde export_avatar.py, en memoria).
#
# Los modelos traen capas, colas y faldones pesados a los huesos de brazos y piernas: al caminar esa tela se arrastra
# con las extremidades. Un vertice pesado a un hueso de brazo o pierna pero lejos del eje de ese hueso no es piel de la
# extremidad: es tela que cuelga. A esos vertices se les pasa el peso de la extremidad al tronco (cadera o columna, el
# hueso mas cercano en altura), de forma gradual segun cuan lejos estan, para que no quede un corte.
from mathutils import Vector

B = 'mixamorig:'
# Radio (en unidades del esqueleto canonico, personaje de ~1 de alto) hasta el que un vertice es de la extremidad.
RADIO = {'Arm': 0.075, 'ForeArm': 0.065, 'Hand': 0.085, 'UpLeg': 0.115, 'Leg': 0.085, 'Foot': 0.1, 'ToeBase': 0.1, 'Shoulder': 0.11}
TRONCO = ['Hips', 'Spine', 'Spine1', 'Spine2']
# En las piernas solo se despega con ese radio lo que cuelga claramente por detras del hueso (capas y colas; el
# personaje mira a -Y). La ropa que envuelve la pierna (abrigos, faldas) debe seguirla: para ella el radio es mayor.
PIERNA = ('UpLeg', 'Leg', 'Foot', 'ToeBase')
DETRAS = 0.10
RADIO_ROPA = 1.9


def _dist_seg(p, a, b):
    d = b - a
    L2 = d.length_squared
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, (p - a).dot(d) / L2))
    return (p - (a + d * t)).length


def despegar_capas(arm, body):
    bones = arm.data.bones
    me = body.data
    groups = {g.index: g for g in body.vertex_groups}
    limb = {}  # indice de grupo -> (cabeza, cola, radio, es de pierna)
    for b in bones:
        name = b.name[len(B):] if b.name.startswith(B) else b.name
        base = name.replace('Left', '').replace('Right', '')
        key = 'Hand' if base.startswith('Hand') else base
        if key not in RADIO or b.name not in body.vertex_groups:
            continue
        child = b.children[0] if b.children else None
        tail = child.head_local if child else b.tail_local
        limb[body.vertex_groups[b.name].index] = (b.head_local.copy(), tail.copy(), RADIO[key], key in PIERNA)
    tronco = [(bones[B + n].head_local.z, body.vertex_groups[B + n]) for n in TRONCO if (B + n) in body.vertex_groups]
    if not limb or not tronco:
        return {"movidos": 0}
    moved = 0
    total = 0.0
    for v in me.vertices:
        take = 0.0
        changes = []
        for g in v.groups:
            if g.group not in limb or g.weight < 1e-4:
                continue
            a, b, r, pierna = limb[g.group]
            if pierna and v.co.y - max(a.y, b.y) < DETRAS:
                r *= RADIO_ROPA
            d = _dist_seg(v.co, a, b)
            if d <= r:
                continue
            f = min(1.0, (d - r) / (0.6 * r))
            changes.append((g.group, g.weight * (1 - f)))
            take += g.weight * f
        if take < 1e-3:
            continue
        for gi, w in changes:
            groups[gi].add([v.index], w, 'REPLACE')
        # al tronco, repartido entre los dos huesos mas cercanos en altura
        zs = sorted(tronco, key=lambda t: abs(t[0] - v.co.z))[:2]
        d0, d1 = abs(zs[0][0] - v.co.z), abs(zs[1][0] - v.co.z)
        w0 = 1.0 if d0 + d1 < 1e-6 else d1 / (d0 + d1)
        zs[0][1].add([v.index], take * w0, 'ADD')
        if w0 < 0.999:
            zs[1][1].add([v.index], take * (1 - w0), 'ADD')
        moved += 1
        total += take
    return {"movidos": moved, "vertices": len(me.vertices), "peso_medio": round(total / moved, 3) if moved else 0}
