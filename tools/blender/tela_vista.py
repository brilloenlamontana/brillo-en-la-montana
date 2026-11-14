# Vista de comprobacion de los huesos de tela: gira cada cadena hacia fuera y saca dos imagenes (atras y lado).
import bpy, math
from mathutils import Vector, Quaternion


def sacar(arm, body, png):
    sc = bpy.context.scene
    hips = arm.data.bones['mixamorig:Hips'].head_local
    for pb in arm.pose.bones:
        if not pb.name.startswith('tela_'):
            continue
        b = pb.bone
        # eje horizontal perpendicular a la direccion "hacia fuera" del hueso: al girar, la tela se abre
        fuera = Vector((b.head_local.x, b.head_local.y - hips.y, 0))
        if fuera.length < 1e-4:
            fuera = Vector((0, 1, 0))
        eje = Vector((0, 0, 1)).cross(fuera.normalized())
        ang = math.radians(22 if pb.name.endswith('_0') else 9)
        q = Quaternion(eje, -ang)
        rest = b.matrix_local.to_quaternion()
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = rest.inverted() @ q @ rest
    bpy.context.view_layer.update()
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'TEXTURE'
    sh.show_cavity = True
    sc.render.resolution_x, sc.render.resolution_y = 420, 520
    sc.render.film_transparent = False
    for o in bpy.context.view_layer.objects:
        if o not in (arm, body):
            o.hide_render = True
    H = 1.1 * arm.scale.z
    for i, (ang, nombre) in enumerate(((155, 'atras'), (90, 'lado'))):
        cam = bpy.data.objects.new('vista%d' % i, bpy.data.cameras.new('vista%d' % i))
        sc.collection.objects.link(cam)
        r = math.radians(ang)
        d = H * 2.3
        cam.location = (math.sin(r) * d, -math.cos(r) * d, H * 0.55)
        cam.rotation_euler = (Vector((0, 0, H * 0.45)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        sc.camera = cam
        sc.render.filepath = png.replace('.png', '_%s.png' % nombre)
        bpy.ops.render.render(write_still=True)
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()
