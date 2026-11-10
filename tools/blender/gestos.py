# Uso: blender --background Animaciones.blend --python gestos.py -- <carpeta animations> <carpeta trabajo> [Clip ...]
#
# Genera a mano (por codigo, sin Mixamo) los gestos con los que el avatar saca un objeto de la mochila y lo usa. Cada
# gesto se describe en tools/blender/gestos/<Clip>.json (ver LEEME.md en esa carpeta) y sale como
# shared/<Clip>.glb: un GLB de solo esqueleto que comparten los 12 avatares. No guarda el .blend.
#
# Como se resuelve cada cuadro (30 por segundo), partiendo de la pose del Idle:
#   - Torso, cuello y cabeza: giros en grados respecto a la pose base, en ejes del cuerpo.
#   - Brazos: cinematica inversa de dos huesos. Se da donde va la muneca y hacia donde apunta el codo; el brazo y el
#     antebrazo giran solo lo que permite la bisagra del codo (nada de retorcer el hueso sobre si mismo).
#   - Muneca: orientacion explicita (hacia donde miran los nudillos y hacia donde sale un objeto empunado, o hacia
#     donde mira la palma). Por defecto prolonga el antebrazo.
#   - Dedos: cierre de 0 (mano abierta) a 1 (puno).
# Entre poses clave los valores se interpolan con curvas suaves (la mano traza arcos, no rectas) y se resuelve la
# cinematica en cada cuadro. Ademas del GLB deja en la carpeta de trabajo <Clip>.pose.json (la pose de cada cuadro,
# para la vista previa sobre un personaje) y <Clip>.medidas.json (angulos, alcance, velocidad y avisos anatomicos).
import bpy, sys, os, json, math, traceback, glob
from mathutils import Matrix, Vector, Quaternion

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glbtool

a = sys.argv[sys.argv.index('--') + 1:]
OUT, WORK, SOLO = a[0], a[1], a[2:]
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gestos')
BASE_ACTION = 'IdleFemale'
FPS = 30
os.makedirs(WORK, exist_ok=True)
rep = {"file": bpy.data.filepath, "clips": {}}

SPINE = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head']
SIDES = {'derecho': 'Right', 'izquierdo': 'Left'}
FINGERS = ['Index', 'Middle', 'Ring', 'Pinky']
# Grados que dobla cada falange con el puno cerrado, y con la mano relajada.
CURL = [72.0, 88.0, 58.0]
RELAX = 6.0
# Metros que mide una unidad del esqueleto canonico en un personaje de 1,70 m.
M_POR_UNIDAD = 1.7 / 1.013


def gltf_kwargs(**kw):
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    return {k: v for k, v in kw.items() if k in props}


def use_action(ad, action):
    ad.action = action
    if hasattr(ad, 'action_suitable_slots') and len(ad.action_suitable_slots):
        ad.action_slot = ad.action_suitable_slots[0]


def orth(v, *against):
    v = v.copy()
    for o in against:
        v -= o * v.dot(o)
    return v.normalized() if v.length > 1e-9 else None


def orient(p_local, s_local, p_world, s_world):
    """Rotacion 3x3 que lleva el eje local p a p_world y, en lo posible, el eje local s a s_world."""
    a1 = p_local.normalized()
    a2 = orth(s_local, a1)
    b1 = p_world.normalized()
    b2 = orth(s_world, b1)
    if b2 is None:
        b2 = orth(Vector((0, 0, 1)), b1) or orth(Vector((1, 0, 0)), b1)
    A = Matrix((a1, a2, a1.cross(a2))).transposed()
    B = Matrix((b1, b2, b1.cross(b2))).transposed()
    return B @ A.transposed()


def hermite(p0, p1, m0, m1, dt, u):
    u2, u3 = u * u, u * u * u
    return p0 * (2 * u3 - 3 * u2 + 1) + m0 * (dt * (u3 - 2 * u2 + u)) + p1 * (-2 * u3 + 3 * u2) + m1 * (dt * (u3 - u2))


class Canal:
    """Un valor (numero o vector) con poses clave en el tiempo, interpolado con una curva suave. La curva se detiene
    (velocidad cero) en la primera y la ultima clave y donde dos claves seguidas valen lo mismo (una pausa)."""

    def __init__(self, tiempos, valores):
        self.t, self.v = tiempos, valores
        n = len(valores)
        igual = lambda x, y: (x - y).length < 1e-6 if hasattr(x, 'length') else abs(x - y) < 1e-6
        self.quieto = [i == 0 or i == n - 1 or igual(valores[i], valores[i - 1]) or igual(valores[i], valores[i + 1]) for i in range(n)]

    def tangente(self, i, vals):
        if self.quieto[i]:
            return vals[i] * 0
        return (vals[i + 1] - vals[i - 1]) * (1.0 / (self.t[i + 1] - self.t[i - 1]))

    def en(self, t, vals=None):
        vals = self.v if vals is None else vals
        if t <= self.t[0]:
            return vals[0] * 1
        if t >= self.t[-1]:
            return vals[-1] * 1
        i = max(k for k in range(len(self.t) - 1) if self.t[k] <= t)
        dt = self.t[i + 1] - self.t[i]
        return hermite(vals[i], vals[i + 1], self.tangente(i, vals), self.tangente(i + 1, vals), dt, (t - self.t[i]) / dt)


try:
    sc = bpy.context.scene
    sc.render.fps = FPS
    arm = bpy.data.objects['Avatar']
    PB = {pb.name.split(':')[-1]: pb for pb in arm.pose.bones}
    RB = {n: pb.bone for n, pb in PB.items()}

    if arm.animation_data is None:
        arm.animation_data_create()
    ad = arm.animation_data
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    arm.hide_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm

    base_action = bpy.data.actions[BASE_ACTION]
    use_action(ad, base_action)
    sc.frame_set(int(round(base_action.frame_range[0])))
    bpy.context.view_layer.update()
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    BASE = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}
    hips_loc = PB['Hips'].location.copy()

    # Ejes del cuerpo (el esqueleto mira hacia -Y en reposo).
    U = Vector((0, 0, 1))
    L = orth(RB['LeftArm'].head_local - RB['RightArm'].head_local, U)
    F = L.cross(U).normalized()
    cuerpo = lambda v: Vector((v.dot(F), v.dot(L), v.dot(U)))
    mundo = lambda c: F * c[0] + L * c[1] + U * c[2]

    def local(bone, v):
        return RB[bone].matrix_local.to_3x3().inverted() @ v

    # Lo que hay que saber de cada brazo en reposo (T): longitudes, eje de la bisagra del codo y ejes de la mano.
    ARM = {}
    for lado, S in SIDES.items():
        s = 1.0 if S == 'Right' else -1.0
        up, fore, hand, mid = S + 'Arm', S + 'ForeArm', S + 'Hand', S + 'HandMiddle1'
        d = {
            'up': up, 'fore': fore, 'hand': hand, 'shoulder': S + 'Shoulder', 's': s,
            'a': (RB[fore].head_local - RB[up].head_local).length,
            'b': (RB[hand].head_local - RB[fore].head_local).length,
            # Hacia el hueso hijo, y la bisagra: girar en positivo alrededor de ella flexiona el codo.
            'up_dir': local(up, RB[fore].head_local - RB[up].head_local).normalized(),
            'fore_dir': local(fore, RB[hand].head_local - RB[fore].head_local).normalized(),
            'up_hinge': local(up, U * s), 'fore_hinge': local(fore, U * s),
            # Mano: hacia los nudillos, hacia donde sale un objeto empunado (lado del pulgar) y hacia donde mira la palma.
            'nudillos': local(hand, RB[mid].head_local - RB[hand].head_local).normalized(),
            'filo': local(hand, F), 'palma': local(hand, -U),
            'nudillo_pos': local(hand, RB[mid].head_local - RB[hand].head_local),
        }
        d['largo'] = d['a'] + d['b']
        d['filo'] = orth(d['filo'], d['nudillos'])
        d['palma'] = orth(d['palma'], d['nudillos'], d['filo'])
        d['dedos'] = []
        for f in FINGERS:
            for j in (1, 2, 3):
                name = S + 'Hand' + f + str(j)
                d['dedos'].append((name, j - 1, local(name, F * s).normalized()))
        d['pulgar'] = [(S + 'HandThumb' + str(j), local(S + 'HandThumb' + str(j), L).normalized()) for j in (1, 2)]
        ARM[lado] = d

    # Ejes de cada mano en el espacio de su hueso: los usa el juego para colocar el objeto (gestos_ts.py).
    if not SOLO:
        json.dump({lado: {'filo': [round(x, 4) for x in d['filo']], 'palma': [round(x, 4) for x in d['palma']]} for lado, d in ARM.items()},
                  open(os.path.join(DIR, '_esqueleto.json'), 'w', encoding='utf-8'), indent=1)

    # Puntos de referencia del cuerpo (hueso, posicion en reposo): siguen al hueso cuando el torso gira.
    head_h = RB['HeadTop_End'].head_local.z - RB['Head'].head_local.z
    def ojo(s):
        return RB['Head'].head_local + U * (0.36 * head_h) + F * (0.62 * head_h) - L * (s * 0.17 * head_h)
    REFS = {
        'cabeza': ('Head', RB['Head'].head_local.copy()),
        'pecho': ('Spine2', RB['Spine2'].head_local + F * 0.085),
        'cadera': ('Hips', RB['Hips'].head_local.copy()),
        'mochila': ('Spine1', RB['Spine1'].head_local - F * 0.12),
    }

    def punto(ref, lado):
        if ref == 'hombro':
            return PB[ARM[lado]['up']].head.copy()
        if ref == 'ojo':
            bone, rest = 'Head', ojo(ARM[lado]['s'])
        else:
            bone, rest = REFS[ref]
        return PB[bone].matrix @ (RB[bone].matrix_local.inverted() @ rest)

    def turn_world(name, axis, degrees):
        if abs(degrees) < 1e-6:
            return
        pb = PB[name]
        head = Matrix.Translation(pb.head)
        pb.matrix = head @ Matrix.Rotation(math.radians(degrees), 4, axis) @ head.inverted() @ pb.matrix
        bpy.context.view_layer.update()

    def set_rotation(name, rot3):
        pb = PB[name]
        pb.matrix = Matrix.Translation(pb.head) @ rot3.to_4x4()
        bpy.context.view_layer.update()

    def reset_pose():
        for pb in arm.pose.bones:
            pb.matrix_basis = BASE[pb.name].copy()
        bpy.context.view_layer.update()

    # Como esta cada brazo en el Idle, en los mismos terminos en que se describen las poses clave.
    reset_pose()
    BASE_ARM = {}
    for lado, d in ARM.items():
        S_, E_, W_ = PB[d['up']].head, PB[d['fore']].head, PB[d['hand']].head
        n = (W_ - S_).normalized()
        hand_rot = PB[d['hand']].matrix.to_3x3()
        BASE_ARM[lado] = {
            'ref': 'hombro', 'mano': cuerpo(W_ - S_) * (1.0 / d['largo']),
            'codo': cuerpo(orth(E_ - S_, n) or -U),
            'nudillos': cuerpo(hand_rot @ d['nudillos']), 'filo': cuerpo(hand_rot @ d['filo']),
            'cierre': 0.2, 'sube': None, 'adelanta': 0.0,
        }
    rep['base'] = {lado: {k: ([round(x, 3) for x in v] if hasattr(v, 'length') else v) for k, v in b.items()} for lado, b in BASE_ARM.items()}

    def vec(v):
        return Vector(v).normalized() if v is not None else None

    def leer_brazo(lado, spec):
        """Una pose clave de un brazo, completa: lo que no se indica queda como en el Idle (la muneca, si se mueve la
        mano pero no se dice como va, prolonga el antebrazo)."""
        b = dict(BASE_ARM[lado])
        if not spec:
            return b
        b.update({'nudillos': None, 'filo': None})
        s = ARM[lado]['s']
        if 'mano' in spec:
            b['mano'], b['ref'] = Vector(spec['mano']), spec.get('ref', 'hombro')
        if 'codo' in spec:
            b['codo'] = vec(spec['codo'])
        if 'nudillos' in spec:
            b['nudillos'] = vec(spec['nudillos'])
        if 'filo' in spec:
            b['filo'] = vec(spec['filo'])
        elif 'palma' in spec:
            b['palma_dir'] = vec(spec['palma'])
        b['cierre'] = float(spec.get('cierre', b['cierre']))
        hombro = spec.get('hombro', {})
        b['sube'] = hombro.get('sube')
        b['adelanta'] = float(hombro.get('adelanta', 0.0))
        return b

    def solve_frame(clip, t, canales):
        """Deja el esqueleto en la pose del instante t y devuelve las medidas de cada brazo."""
        reset_pose()
        for bone in SPINE:
            for axis_name, axis in (('pitch', L), ('yaw', U), ('roll', F)):
                turn_world(bone, axis, canales['torso'][bone][axis_name].en(t))
        medidas = {}
        orden = sorted(clip['lados'], key=lambda lado: any(k['ref'] == 'otra_mano' for k in clip['brazos_clave'][lado]))
        for lado in orden:
            d, claves, C = ARM[lado], clip['brazos_clave'][lado], canales[lado]
            s = d['s']
            otro = 'izquierdo' if lado == 'derecho' else 'derecho'

            def destino():
                pts = []
                for k in claves:
                    origen = PB[ARM[otro]['hand']].head.copy() if k['ref'] == 'otra_mano' else punto(k['ref'], lado)
                    pts.append(origen + mundo(k['mano']) * d['largo'])
                return C['mano'].en(t, pts)

            # Clavicula: sube con el brazo (sola, si no se indica) y puede adelantarse.
            sube = C['sube'].en(t)
            if any(k['sube'] is None for k in claves):
                alto = (destino() - PB[d['up']].head).normalized().dot(U)
                auto = 16.0 * max(0.0, alto + 0.15)
                sube = C['sube_peso'].en(t) * sube + (1 - C['sube_peso'].en(t)) * auto
            turn_world(d['shoulder'], F * -s, sube)
            turn_world(d['shoulder'], U * s, C['adelanta'].en(t))

            S_ = PB[d['up']].head.copy()
            T_ = destino()
            dist_pedida = (T_ - S_).length
            dist = min(max(dist_pedida, 0.12 * d['largo']), 0.998 * d['largo'])
            n = (T_ - S_).normalized()
            polo = orth(mundo(C['codo'].en(t)), n) or orth(-U, n) or orth(-F, n)
            cos_s = max(-1.0, min(1.0, (d['a'] ** 2 + dist ** 2 - d['b'] ** 2) / (2 * d['a'] * dist)))
            E_ = S_ + n * (d['a'] * cos_s) + polo * (d['a'] * math.sqrt(max(0.0, 1 - cos_s * cos_s)))
            W_ = S_ + n * dist
            bisagra = polo.cross(n).normalized()
            set_rotation(d['up'], orient(d['up_dir'], d['up_hinge'], E_ - S_, bisagra))
            fore_rot = orient(d['fore_dir'], d['fore_hinge'], W_ - PB[d['fore']].head, bisagra)
            set_rotation(d['fore'], fore_rot)

            # Muneca: lo que no se indica en una clave es "natural": la mano prolonga el antebrazo.
            natural = fore_rot @ RB[d['fore']].matrix_local.to_3x3().inverted() @ RB[d['hand']].matrix_local.to_3x3()
            nud_nat, filo_nat = natural @ d['nudillos'], natural @ d['filo']
            nuds = [mundo(k['nudillos']) if k['nudillos'] is not None else nud_nat for k in claves]
            nud = C['nudillos'].en(t, nuds).normalized()
            filos = []
            for k, nk in zip(claves, nuds):
                if k['filo'] is not None:
                    filos.append(mundo(k['filo']))
                elif k.get('palma_dir') is not None:
                    p = mundo(k['palma_dir'])
                    filos.append(nk.cross(p) if s > 0 else p.cross(nk))
                else:
                    filos.append(filo_nat)
            filo = orth(C['filo'].en(t, filos), nud) or orth(filo_nat, nud)
            # Girar la mano sobre el eje del antebrazo (pronar o supinar) lo hace el antebrazo entero, no la muneca
            # sola: la mitad del giro se le da al hueso del antebrazo para que la piel no se retuerza en la muneca.
            # En reposo (T, palma abajo) el antebrazo esta pronado; positivo = supinar (palma hacia arriba).
            ante_eje = (W_ - PB[d['fore']].head).normalized()
            f0, f1 = orth(filo_nat, ante_eje), orth(filo, ante_eje)
            giro = math.atan2(f0.cross(f1).dot(ante_eje), f0.dot(f1)) if f0 and f1 else 0.0
            # Siempre por el lado de la supinacion (hasta palma arriba y un poco mas), sin saltar de +180 a -180.
            if giro * s < math.radians(-70):
                giro += s * 2 * math.pi
            set_rotation(d['fore'], Matrix.Rotation(giro * 0.5, 3, ante_eje) @ fore_rot)
            set_rotation(d['hand'], orient(d['nudillos'], d['filo'], nud, filo))

            cierre = max(0.0, min(1.0, C['cierre'].en(t)))
            for name, j, axis in d['dedos']:
                PB[name].matrix_basis = Quaternion(axis, math.radians(RELAX + cierre * CURL[j])).to_matrix().to_4x4()
            for name, axis in d['pulgar']:
                PB[name].matrix_basis = BASE[PB[name].name] @ Quaternion(axis, math.radians(cierre * 30.0)).to_matrix().to_4x4()

            brazo = (E_ - S_).normalized()
            ante = (W_ - E_).normalized()
            medidas[lado] = {
                'muneca': W_, 'codo_pos': E_, 'hombro_pos': S_, 'filo': filo, 'nudillos': nud,
                'flexion_codo': math.degrees(brazo.angle(ante)),
                'alcance': dist_pedida / d['largo'],
                'brazo': cuerpo(brazo),
                'muneca_doblada': math.degrees(nud.angle(ante)),
                'supinacion': math.degrees(giro) * s,
            }
        bpy.context.view_layer.update()
        return medidas

    def dist_segmento(p, a_, b_):
        ab = b_ - a_
        u = max(0.0, min(1.0, (p - a_).dot(ab) / max(ab.length_squared, 1e-12)))
        return (p - (a_ + ab * u)).length

    def dist_segmentos(p1, q1, p2, q2, pasos=12):
        return min(dist_segmento(p1 + (q1 - p1) * (i / pasos), p2, q2) for i in range(pasos + 1))

    todos = sorted(glob.glob(os.path.join(DIR, 'Use*.json')))
    for path in todos:
        spec = json.load(open(path, encoding='utf-8'))
        name = spec['nombre']
        if SOLO and name not in SOLO:
            continue
        claves = sorted(spec['claves'], key=lambda k: k['t'])
        tiempos = [float(k['t']) for k in claves]
        lados = ['derecho', 'izquierdo'] if spec.get('brazos', 'derecho') == 'ambos' else ['derecho' if spec.get('brazos', 'derecho') == 'derecho' else 'izquierdo']
        clip = {'lados': lados, 'brazos_clave': {lado: [leer_brazo(lado, k.get(lado)) for k in claves] for lado in lados}}
        canales = {'torso': {b: {ax: Canal(tiempos, [float(k.get('torso', {}).get(b, {}).get(ax, 0.0)) for k in claves]) for ax in ('pitch', 'yaw', 'roll')} for b in SPINE}}
        cero = Vector((0, 0, 0))
        for lado in lados:
            ks = clip['brazos_clave'][lado]
            canales[lado] = {
                # Los vectores de mano, nudillos y filo dependen del cuadro (referencias que se mueven): se pasan al evaluar.
                'mano': Canal(tiempos, [k['mano'] if k['ref'] == 'hombro' else k['mano'] + Vector((9, 9, 9)) * (1 + i) for i, k in enumerate(ks)]),
                'codo': Canal(tiempos, [k['codo'] for k in ks]),
                'nudillos': Canal(tiempos, [k['nudillos'] if k['nudillos'] is not None else cero for k in ks]),
                'filo': Canal(tiempos, [k['filo'] if k['filo'] is not None else (k.get('palma_dir') or cero) for k in ks]),
                'cierre': Canal(tiempos, [k['cierre'] for k in ks]),
                'sube': Canal(tiempos, [float(k['sube'] or 0.0) for k in ks]),
                'sube_peso': Canal(tiempos, [0.0 if k['sube'] is None else 1.0 for k in ks]),
                'adelanta': Canal(tiempos, [k['adelanta'] for k in ks]),
            }
            # Dos claves seguidas con la mano en el mismo sitio (misma referencia y posicion) son una pausa.
            n = len(ks)
            mismo = lambda x, y: x['ref'] == y['ref'] and (x['mano'] - y['mano']).length < 1e-6
            canales[lado]['mano'].quieto = [i == 0 or i == n - 1 or mismo(ks[i], ks[i - 1]) or mismo(ks[i], ks[i + 1]) for i in range(n)]

        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
        action = bpy.data.actions.new(name)
        use_action(ad, action)
        n_frames = int(round(tiempos[-1] * FPS))
        objeto = spec.get('objeto') or {}
        mano_objeto = 'izquierdo' if objeto.get('mano') == 'izquierda' else 'derecho'
        largo_objeto = float(objeto.get('largo', 0)) / M_POR_UNIDAD if objeto.get('agarre') == 'extremo' else 0.0
        visible = objeto.get('visible', [0, 0])
        pose, cuadros, avisos, previo = [], [], [], {}
        for frame in range(n_frames + 1):
            t = frame / FPS
            sc.frame_set(frame)
            med = solve_frame(clip, t, canales)
            for pb in arm.pose.bones:
                pb.keyframe_insert('rotation_quaternion', frame=frame)
            PB['Hips'].location = hips_loc
            PB['Hips'].keyframe_insert('location', frame=frame)
            pose.append({pb.name: [round(x, 6) for x in pb.rotation_quaternion] for pb in arm.pose.bones})

            # Medidas y avisos anatomicos de este cuadro.
            torso_a, torso_b = PB['Hips'].head.copy(), PB['Neck'].head.copy()
            cabeza = PB['Head'].head + U * (0.45 * head_h)
            fila = {'cuadro': frame, 't': round(t, 3)}
            for lado, m in med.items():
                vel = ((m['muneca'] - previo[lado]).length * FPS * M_POR_UNIDAD) if lado in previo else 0.0
                previo[lado] = m['muneca'].copy()
                c = cuerpo(m['muneca'] - PB['Hips'].head) * M_POR_UNIDAD
                fila[lado] = {
                    'muneca_m': [round(x, 2) for x in c], 'codo_flexion': round(m['flexion_codo']), 'alcance': round(m['alcance'], 2),
                    'muneca_doblada': round(m['muneca_doblada']), 'supinacion': round(m['supinacion']),
                    'vel_m_s': round(vel, 2), 'brazo': [round(x, 2) for x in m['brazo']],
                }
                donde = '%s cuadro %d (t=%.2f)' % (lado, frame, t)
                if m['alcance'] > 1.0:
                    avisos.append('%s: la mano no llega (pide %.0f %% del largo del brazo)' % (donde, 100 * m['alcance']))
                if m['flexion_codo'] > 150:
                    avisos.append('%s: codo demasiado cerrado (%.0f grados)' % (donde, m['flexion_codo']))
                if m['brazo'][0] < -0.72:
                    avisos.append('%s: el brazo apunta demasiado hacia atras (el hombro no extiende mas de ~45 grados)' % donde)
                if m['brazo'][0] < -0.25 and m['brazo'][2] > 0.45:
                    avisos.append('%s: brazo arriba y atras a la vez (postura forzada del hombro)' % donde)
                if m['brazo'][1] * ARM[lado]['s'] > 0.75 and m['brazo'][0] < 0.2:
                    avisos.append('%s: el brazo cruza el pecho por dentro del cuerpo' % donde)
                if m['muneca_doblada'] > 65:
                    avisos.append('%s: muneca doblada %.0f grados (maximo razonable ~65)' % (donde, m['muneca_doblada']))
                if m['supinacion'] < -25 or m['supinacion'] > 165:
                    avisos.append('%s: antebrazo girado %.0f grados (el rango va de -25, mas pronado que palma abajo, a 165, palma arriba del todo)' % (donde, m['supinacion']))
                if dist_segmento(m['muneca'], torso_a, torso_b) < 0.06:
                    avisos.append('%s: la muneca atraviesa el torso' % donde)
                if (m['muneca'] - cabeza).length < 0.055:
                    avisos.append('%s: la muneca atraviesa la cabeza' % donde)
                if dist_segmento(m['codo_pos'], torso_a, torso_b) < 0.05:
                    avisos.append('%s: el codo atraviesa el torso' % donde)
            if largo_objeto and visible[0] <= t <= visible[1] and mano_objeto in med:
                m = med[mano_objeto]
                sentido = -1.0 if objeto.get('invertir') else 1.0
                p0 = m['muneca'] + m['nudillos'] * 0.05
                p1 = p0 + m['filo'] * (largo_objeto * 1.0)
                fila['punta_m'] = [round(x, 2) for x in cuerpo(p1 - PB['Hips'].head) * M_POR_UNIDAD]
                fila['filo'] = [round(x, 2) for x in cuerpo(m['filo'])]
                donde = 'objeto cuadro %d (t=%.2f)' % (frame, t)
                if dist_segmentos(p0 + m['filo'] * 0.06, p1, torso_a, torso_b) < 0.07:
                    avisos.append('%s: la hoja atraviesa el torso' % donde)
                if dist_segmento(cabeza, p0, p1) < 0.07:
                    avisos.append('%s: la hoja atraviesa la cabeza' % donde)
                for S in ('Left', 'Right'):
                    if dist_segmentos(p0 + m['filo'] * 0.06, p1, PB[S + 'UpLeg'].head, PB[S + 'Foot'].head) < 0.04:
                        avisos.append('%s: la hoja atraviesa la pierna %s' % (donde, 'izquierda' if S == 'Left' else 'derecha'))
                if p1.z < 0.0:
                    avisos.append('%s: la punta se clava en el suelo' % donde)
            cuadros.append(fila)

        sc.frame_start, sc.frame_end = 0, n_frames
        sc.frame_set(0)
        dst = os.path.join(OUT, 'shared', name + '.glb')
        tmp = dst + '.tmp.glb'
        kw = gltf_kwargs(filepath=tmp, export_format='GLB', use_selection=True, export_animations=True,
                         export_animation_mode='ACTIVE_ACTIONS', export_force_sampling=True, export_frame_range=True,
                         export_anim_slide_to_zero=True, export_optimize_animation_size=True,
                         export_optimize_animation_keep_anim_armature=False, export_optimize_animation_keep_anim_object=False,
                         export_anim_single_armature=True, export_reset_pose_bones=True, export_skins=True,
                         export_def_bones=False, export_yup=True, export_cameras=False, export_lights=False, export_extras=False)
        bpy.ops.export_scene.gltf(**kw)
        glbtool.slim_animation(tmp, dst)
        os.remove(tmp)
        js, b = glbtool.read_glb(dst)
        for an in js['animations']:
            an['name'] = name
        glbtool.write_glb(dst, js, b)
        json.dump({'fps': FPS, 'hips': list(hips_loc), 'cuadros': pose}, open(os.path.join(WORK, name + '.pose.json'), 'w'))
        json.dump({'clip': name, 'duracion': tiempos[-1], 'cuadros': cuadros, 'avisos': avisos},
                  open(os.path.join(WORK, name + '.medidas.json'), 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
        rep['clips'][name] = {'bytes': os.path.getsize(dst), 'cuadros': n_frames + 1, 'avisos': len(avisos)}
    rep['status'] = 'ok'
except Exception:
    rep['status'] = 'error'; rep['err'] = traceback.format_exc()
open(os.path.join(WORK, '_reporte.json' if not SOLO else '_reporte_%s.json' % '_'.join(SOLO)), 'w', encoding='utf-8').write(json.dumps(rep, indent=1, default=str))
