# Uso: blender --background Animaciones.blend --python export_anims.py -- <carpeta animations> <reporte.json> <rest_canon.json>
# Exporta cada accion como un GLB de solo esqueleto (rotaciones + traslacion de la cadera), reutilizable por todos los avatares.
import bpy, sys, os, json, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glbtool

a = sys.argv[sys.argv.index('--') + 1:]
OUT, REP, REST = a[0], a[1], a[2]
MAP = {"IdleFemale": "woman/Idle", "WalkingFemale": "woman/Walking", "RunningFemale": "woman/Running",
       "IdleMale": "man/Idle", "WalkingMale": "man/Walking", "RunningMale": "man/Running",
       "Death": "shared/Death", "Throw": "shared/Throw"}
rep = {"file": bpy.data.filepath, "clips": {}}


def gltf_kwargs(**kw):
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    rep["dropped_kwargs"] = sorted(k for k in kw if k not in props)
    return {k: v for k, v in kw.items() if k in props}


try:
    sc = bpy.context.scene
    arm = bpy.data.objects['Avatar']
    rep["fps"] = sc.render.fps
    rep["arm_scale"] = list(arm.scale)
    rest = {}
    for b in arm.data.bones:
        m = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
        rest[b.name] = {"q": list(m.to_quaternion()), "t": list(m.to_translation()), "parent": b.parent.name if b.parent else None}
    json.dump(rest, open(REST, "w", encoding="utf-8"))
    rep["n_bones"] = len(rest)
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
    for name, rel in MAP.items():
        ac = bpy.data.actions[name]
        ad.action = ac
        if hasattr(ad, 'action_suitable_slots') and len(ad.action_suitable_slots):
            ad.action_slot = ad.action_suitable_slots[0]
        f0, f1 = int(round(ac.frame_range[0])), int(round(ac.frame_range[1]))
        sc.frame_start, sc.frame_end = f0, f1
        sc.frame_set(f0)
        dst = os.path.join(OUT, rel.replace('/', os.sep) + '.glb')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        tmp = dst + '.tmp.glb'
        kw = gltf_kwargs(filepath=tmp, export_format='GLB', use_selection=True, export_animations=True,
                         export_animation_mode='ACTIVE_ACTIONS', export_force_sampling=True, export_frame_range=True,
                         export_anim_slide_to_zero=True, export_optimize_animation_size=True,
                         export_optimize_animation_keep_anim_armature=False, export_optimize_animation_keep_anim_object=False,
                         export_anim_single_armature=True, export_reset_pose_bones=True, export_skins=True,
                         export_def_bones=False, export_yup=True, export_cameras=False, export_lights=False, export_extras=False)
        bpy.ops.export_scene.gltf(**kw)
        raw = os.path.getsize(tmp)
        js0, b0 = glbtool.read_glb(tmp)
        info0 = glbtool.anim_info(js0, b0)
        glbtool.slim_animation(tmp, dst)
        os.remove(tmp)
        js, b = glbtool.read_glb(dst)
        clip = rel.split('/')[-1]
        for an in js['animations']:
            an['name'] = clip
        glbtool.write_glb(dst, js, b)
        js, b = glbtool.read_glb(dst)
        rep["clips"][rel] = {"action": name, "range": [f0, f1], "raw_bytes": raw, "bytes": os.path.getsize(dst),
                             "raw": info0, "final": glbtool.anim_info(js, b), "n_anim": len(js['animations']),
                             "n_nodes": len(js['nodes']), "root_nodes": [js['nodes'][i].get('name') for i in js['scenes'][0]['nodes']]}
    rep["status"] = "ok"
except Exception:
    rep["status"] = "error"; rep["err"] = traceback.format_exc()
open(REP, "w", encoding="utf-8").write(json.dumps(rep, indent=1, default=str))
