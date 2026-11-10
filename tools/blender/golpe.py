# Uso: blender --background Animaciones.blend --python golpe.py -- <carpeta animations> <reporte.json>
# Crea a mano (por codigo, sin Mixamo) la animacion de recibir un golpe y la exporta como shared/Hit.glb, un GLB de
# solo esqueleto que comparten los 12 avatares. No guarda el .blend.
#
# El clip parte de la pose de reposo del Idle y le suma un respingo de medio segundo: el torso se va hacia atras y
# gira como si el golpe entrara por el hombro izquierdo, la cabeza cabecea, los hombros se encogen y los brazos suben
# a cubrirse; luego rebota un poco hacia delante y vuelve. Solo mueve de la cintura para arriba: en el juego se suma
# (mezcla aditiva) a lo que el avatar este haciendo, asi que las piernas siguen quietas, caminando o corriendo.
import bpy, sys, os, json, math, traceback
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glbtool

a = sys.argv[sys.argv.index('--') + 1:]
OUT, REP = a[0], a[1]
ACTION = 'Golpe'
BASE_ACTION = 'IdleFemale'
rep = {"file": bpy.data.filepath}

# Momentos clave (segundos) y cuanto de cada gesto hay en cada uno (0 = pose base, 1 = gesto completo).
#            impacto  retroceso  rebote  vuelta
TIMES = [0.0, 0.07,    0.19,      0.34,   0.52]
# Gestos, en grados y en ejes del cuerpo: 'pitch' + inclina hacia delante, 'yaw' + gira a la izquierda, 'roll' + ladea
# a la derecha (para un brazo colgando: roll + lo abre hacia la izquierda, pitch - lleva la mano hacia delante).
# Cada hueso: {eje: [valor en cada momento clave]}.
POSE = {
    'Spine':         {'pitch': [0, -9, -7, 3, 0], 'yaw': [0, -3, -5, 1, 0]},
    'Spine1':        {'pitch': [0, -9, -7, 4, 0], 'yaw': [0, -5, -8, 2, 0]},
    'Spine2':        {'pitch': [0, -8, -6, 3, 0], 'yaw': [0, -4, -6, 1, 0], 'roll': [0, 4, 5, -1, 0]},
    'Neck':          {'pitch': [0, 9, 4, -2, 0]},
    'Head':          {'pitch': [0, 16, 6, -3, 0], 'roll': [0, 7, 5, -1, 0], 'yaw': [0, 5, 3, 0, 0]},
    'LeftShoulder':  {'roll': [0, 10, 7, 1, 0]},
    'RightShoulder': {'roll': [0, -8, -6, -1, 0]},
    'LeftArm':       {'roll': [0, 11, 8, 2, 0], 'pitch': [0, -12, -8, -2, 0]},
    'RightArm':      {'roll': [0, -8, -6, -1, 0], 'pitch': [0, -14, -9, -2, 0]},
    'LeftForeArm':   {'pitch': [0, -58, -42, -10, 0]},
    'RightForeArm':  {'pitch': [0, -50, -36, -8, 0]},
    'LeftHand':      {'pitch': [0, -12, -8, -2, 0]},
    'RightHand':     {'pitch': [0, -10, -7, -2, 0]},
}
# De padre a hijo: cada giro se aplica en el espacio del cuerpo sobre lo que ya movieron sus padres.
ORDER = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm',
         'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand']


def gltf_kwargs(**kw):
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    return {k: v for k, v in kw.items() if k in props}


try:
    sc = bpy.context.scene
    arm = bpy.data.objects['Avatar']
    fps = sc.render.fps
    rep["fps"] = fps
    bones = {pb.name.split(':')[-1]: pb for pb in arm.pose.bones}
    rep["missing"] = [n for n in ORDER if n not in bones]

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

    # Pose base: el primer cuadro del Idle (brazos abajo), no la T del reposo.
    base_action = bpy.data.actions[BASE_ACTION]
    ad.action = base_action
    if hasattr(ad, 'action_suitable_slots') and len(ad.action_suitable_slots):
        ad.action_slot = ad.action_suitable_slots[0]
    sc.frame_set(int(round(base_action.frame_range[0])))
    bpy.context.view_layer.update()
    base = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}

    # Ejes del cuerpo en el espacio del esqueleto, medidos sobre la pose base.
    up = Vector((0, 0, 1))
    left = (bones['LeftArm'].head - bones['RightArm'].head).normalized()
    left = (left - up * left.dot(up)).normalized()
    toes = (bones['LeftToeBase'].head - bones['LeftFoot'].head)
    toes = (toes - up * toes.dot(up)).normalized()
    fwd = left.cross(up).normalized()
    rep["axes"] = {"left": list(left), "fwd": list(fwd), "toes": list(toes), "fwd_matches_toes": fwd.dot(toes)}
    if fwd.dot(toes) < 0:
        raise RuntimeError('El eje hacia delante no coincide con la punta de los pies')
    AXES = {'pitch': left, 'yaw': up, 'roll': fwd}

    old = bpy.data.actions.get(ACTION)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(ACTION)
    ad.action = action
    if hasattr(ad, 'action_suitable_slots') and len(ad.action_suitable_slots):
        ad.action_slot = ad.action_suitable_slots[0]
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'

    frames = [int(round(t * fps)) for t in TIMES]
    rep["frames"] = frames
    for k, frame in enumerate(frames):
        sc.frame_set(frame)
        for pb in arm.pose.bones:
            pb.matrix_basis = base[pb.name].copy()
        bpy.context.view_layer.update()
        for name in ORDER:
            pb = bones[name]
            turn = Matrix.Identity(4)
            for axis, values in POSE.get(name, {}).items():
                turn = Matrix.Rotation(math.radians(values[k]), 4, AXES[axis]) @ turn
            head = Matrix.Translation(pb.head)
            pb.matrix = head @ turn @ head.inverted() @ pb.matrix
            bpy.context.view_layer.update()
        for pb in arm.pose.bones:
            pb.keyframe_insert('rotation_quaternion', frame=frame)
        bones['Hips'].keyframe_insert('location', frame=frame)

    # Cuanto se mueve la cabeza en el impacto (comprobacion de que el gesto existe y va hacia atras).
    sc.frame_set(frames[0]); bpy.context.view_layer.update()
    h0 = bones['Head'].head.copy(); hand0 = bones['LeftHand'].head.copy()
    sc.frame_set(frames[1]); bpy.context.view_layer.update()
    h1 = bones['Head'].head.copy(); hand1 = bones['LeftHand'].head.copy()
    rep["impact"] = {"head_back_m": -(h1 - h0).dot(fwd), "head_up_m": (h1 - h0).dot(up),
                     "left_hand_up_m": (hand1 - hand0).dot(up), "left_hand_fwd_m": (hand1 - hand0).dot(fwd)}

    f0, f1 = frames[0], frames[-1]
    sc.frame_start, sc.frame_end = f0, f1
    sc.frame_set(f0)
    dst = os.path.join(OUT, 'shared', 'Hit.glb')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
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
        an['name'] = 'Hit'
    glbtool.write_glb(dst, js, b)
    js, b = glbtool.read_glb(dst)
    rep["clip"] = {"bytes": os.path.getsize(dst), "info": glbtool.anim_info(js, b), "n_anim": len(js['animations'])}
    rep["status"] = "ok"
except Exception:
    rep["status"] = "error"; rep["err"] = traceback.format_exc()
open(REP, "w", encoding="utf-8").write(json.dumps(rep, indent=1, default=str))
