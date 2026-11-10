# Uso: blender --background <Personaje.blend> --python export_avatar.py -- <salida.glb> <reporte.json> <rest_canon.json> [max_tex=1024]
# Exporta Avatar + Body como GLB Draco sin animaciones. NO guarda el .blend.
import bpy, sys, os, json, math, traceback
import numpy as np
from mathutils import Vector, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glbtool

a = sys.argv[sys.argv.index('--') + 1:]
OUT, REP, REST = a[0], a[1], a[2]
MAXTEX = int(a[3]) if len(a) > 3 else 1024
rep = {"file": bpy.data.filepath, "out": OUT}


def gltf_kwargs(**kw):
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    rep["dropped_kwargs"] = sorted(k for k in kw if k not in props)
    return {k: v for k, v in kw.items() if k in props}


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


def straighten_legs(arm, body):
    """Los clips compartidos suponen piernas verticales en reposo. Varios modelos traen las piernas abiertas (los pies
    mas separados que las caderas) y con esos clips caminan patiabiertos. Aqui (en memoria, sin guardar el .blend) cada
    pierna se gira hasta dejar el tobillo bajo la cadera, el pie se endereza, la malla se queda con esa pose como nuevo
    reposo y los huesos de la pierna se trasladan a su nuevo sitio sin cambiar su orientacion canonica."""
    from mathutils import Matrix
    B = 'mixamorig:'
    angles, deltas = {}, {}
    for side in ('Left', 'Right'):
        up, foot = arm.pose.bones[B + side + 'UpLeg'], arm.pose.bones[B + side + 'Foot']
        hip, ankle = up.bone.head_local.copy(), foot.bone.head_local.copy()
        th = math.atan2(ankle.x - hip.x, hip.z - ankle.z)
        angles[side] = round(math.degrees(th), 2)
        if abs(th) < math.radians(1.0):
            continue
        up.matrix = Matrix.Translation(hip) @ Matrix.Rotation(th, 4, 'Y') @ Matrix.Translation(-hip) @ up.matrix
        bpy.context.view_layer.update()
        fh = foot.head.copy()
        foot.matrix = Matrix.Translation(fh) @ Matrix.Rotation(-th, 4, 'Y') @ Matrix.Translation(-fh) @ foot.matrix
        bpy.context.view_layer.update()
        for name in ('Leg', 'Foot', 'ToeBase', 'Toe_End'):
            pb = arm.pose.bones.get(B + side + name)
            if pb:
                deltas[pb.name] = pb.head - pb.bone.head_local
    if not deltas:
        return angles
    mod = next(m for m in body.modifiers if m.type == 'ARMATURE')
    mod_name = mod.name
    if body.data.users > 1:
        body.data = body.data.copy()
    with bpy.context.temp_override(object=body, active_object=body, selected_objects=[body], selected_editable_objects=[body]):
        bpy.ops.object.modifier_apply(modifier=mod_name)
    body.modifiers.new(mod_name, 'ARMATURE').object = arm
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    arm.hide_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for name, d in deltas.items():
        eb = arm.data.edit_bones[name]
        eb.head += d
        eb.tail += d
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    return angles


try:
    arm = bpy.data.objects['Avatar']; body = bpy.data.objects['Body']
    arm.animation_data_clear()
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    rep["legs_deg"] = straighten_legs(arm, body)
    rep["arm_scale"] = [round(x, 6) for x in arm.scale]
    rep["arm_loc"] = [round(x, 6) for x in arm.location]
    rep["arm_rot"] = [round(x, 6) for x in arm.rotation_euler]
    bb = [body.matrix_world @ Vector(c) for c in body.bound_box]
    rep["bbox_min"] = [round(min(v[i] for v in bb), 4) for i in range(3)]
    rep["bbox_max"] = [round(max(v[i] for v in bb), 4) for i in range(3)]
    rep["height"] = round(rep["bbox_max"][2] - rep["bbox_min"][2], 4)
    rep["verts"] = len(body.data.vertices)
    # pose de reposo contra la canonica
    canon = json.load(open(REST, encoding="utf-8"))
    worst = []
    for b in arm.data.bones:
        if b.name not in canon:
            worst.append([999, b.name]); continue
        m = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
        q = m.to_quaternion(); qc = Quaternion(canon[b.name]["q"])
        worst.append([round(math.degrees(q.rotation_difference(qc).angle), 3), b.name])
    worst.sort(reverse=True)
    rep["n_bones"] = len(arm.data.bones)
    rep["missing_bones"] = [n for n in canon if n not in arm.data.bones]
    rep["rest_max_deg"] = worst[0][0]
    rep["rest_worst"] = worst[:4]
    hb = arm.data.bones['mixamorig:Hips']
    rep["hips_rest"] = [round(x, 4) for x in hb.head_local]
    # materiales: alfa y texturas
    mats = []
    any_alpha = False
    done = {}
    for m in body.data.materials:
        if not m or not m.node_tree:
            continue
        d = {"name": m.name, "images": []}
        nt = m.node_tree
        alpha_min = None
        for n in nt.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                s = n.inputs.get('Alpha')
                if s and s.is_linked:
                    src = s.links[0].from_node
                    if src.type == 'TEX_IMAGE' and src.image:
                        px = pixels(src.image)
                        alpha_min = float(px[..., 3].min())
                        d["alpha_frac_below_0.5"] = float((px[..., 3] < 0.5).mean())
                        if alpha_min >= 0.98:
                            for l in list(s.links):
                                nt.links.remove(l)
                            d["alpha"] = "unlinked(opaque)"
                        else:
                            d["alpha"] = "kept"; any_alpha = True
                    else:
                        d["alpha"] = "kept(non-image)"; any_alpha = True
        d["alpha_min"] = alpha_min
        for n in nt.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                img = n.image
                row = [img.name, list(img.size), img.colorspace_settings.name]
                if max(img.size) > MAXTEX:
                    if img.name not in done:
                        px = downscale(pixels(img), MAXTEX)
                        h, w = px.shape[:2]
                        new = bpy.data.images.new(img.name + '_s', w, h, alpha=True)
                        new.colorspace_settings.name = img.colorspace_settings.name
                        new.alpha_mode = img.alpha_mode
                        new.pixels.foreach_set(np.ascontiguousarray(px, dtype=np.float32).ravel())
                        done[img.name] = new
                    n.image = done[img.name]
                    row.append(list(n.image.size))
                d["images"].append(row)
        mats.append(d)
    rep["materials"] = mats
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in (arm, body):
        o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    kw = gltf_kwargs(filepath=OUT, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                     export_animations=False, export_skins=True, export_all_influences=False, export_def_bones=False,
                     export_rest_position_armature=True, export_morph=False, export_cameras=False, export_lights=False,
                     export_extras=False, export_armature_object_remove=False,
                     export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                     export_draco_position_quantization=14, export_draco_normal_quantization=10,
                     export_draco_texcoord_quantization=12, export_draco_color_quantization=10,
                     export_draco_generic_quantization=12,
                     export_image_format='AUTO' if any_alpha else 'JPEG', export_jpeg_quality=88,
                     export_materials='EXPORT', export_tangents=False)
    bpy.ops.export_scene.gltf(**kw)
    rep["bytes"] = os.path.getsize(OUT)
    rep["glb"] = glbtool.describe(OUT)
    g = rep["glb"]
    rep["checks"] = {"avatar_node": 'Avatar' in g["nodes"], "body_node": 'Body' in g["nodes"], "hips_node": 'mixamorig:Hips' in g["nodes"],
                     "joints": g["skins"], "draco": all(m["draco"] for m in g["meshes"]), "no_anim": not g["animations"]}
    rep["status"] = "ok"
except Exception:
    rep["status"] = "error"; rep["err"] = traceback.format_exc()
open(REP, "w", encoding="utf-8").write(json.dumps(rep, indent=1, default=str))
