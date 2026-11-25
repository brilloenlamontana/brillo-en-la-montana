"""Top-down picture of Map.blend for the game's map: orthographic, north up. Run with Blender in the background; the
.blend is not saved. Usage: blender -b Map.blend --python mapa_render.py -- <out.png> <log.json> <px_per_metre>"""
import bpy, json, re, sys, traceback

out, log, ppm = sys.argv[sys.argv.index('--') + 1:][:3]
ppm = float(ppm)
# The stretch of the world the picture covers (game x, z), as MAP_PICTURE in src/game/world/landmarks.ts.
X = (-152.0, 174.0)
Z = (-268.0, 88.0)
rep = {}
try:
    scene = bpy.context.scene
    # What is not part of the look of the world: collision shapes, the limits of the map, the wells' physics and
    # darkness, the green beam of the sanctuary.
    pat = re.compile(r"colisi|collider|^LimitesJuego$|^LimiteMapa$|^PantanoPozos|^Haz|HazVerde|Rayo|Beam", re.I)
    hidden = []
    for col in bpy.data.collections:
        if pat.search(col.name):
            col.hide_render = True
            hidden.append(col.name)
    for ob in bpy.data.objects:
        if pat.search(ob.name) or ob.display_type in {'WIRE', 'BOUNDS'}:
            ob.hide_render = True
    rep['hidden_collections'] = hidden

    cam_data = bpy.data.cameras.new('MapaCam')
    cam_data.type = 'ORTHO'
    width, height = X[1] - X[0], Z[1] - Z[0]
    cam_data.ortho_scale = max(width, height)
    cam_data.clip_start = 1
    cam_data.clip_end = 2000
    cam = bpy.data.objects.new('MapaCam', cam_data)
    scene.collection.objects.link(cam)
    # Game z = -Blender y; looking straight down, the top of the picture is +y (north).
    cam.location = ((X[0] + X[1]) / 2, -(Z[0] + Z[1]) / 2, 600)
    cam.rotation_euler = (0, 0, 0)
    scene.camera = cam

    r = scene.render
    r.engine = 'BLENDER_WORKBENCH'
    r.resolution_x = int(round(width * ppm))
    r.resolution_y = int(round(height * ppm))
    r.resolution_percentage = 100
    r.film_transparent = True
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.filepath = out
    sh = scene.display.shading
    sh.light = 'FLAT'
    sh.color_type = 'TEXTURE'
    sh.show_shadows = False
    sh.show_object_outline = False
    sh.show_specular_highlight = False
    scene.display.render_aa = '8'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    base = out[:-4]
    # 1) everything, flat: the ground must not show its relief (it would give away where the hidden wells are).
    sh.show_cavity = False
    r.filepath = base + '_plano.png'
    bpy.ops.render.render(write_still=True)
    # 2) everything, with a little depth at edges and hollows (tree crowns, roofs, rocks).
    sh.show_cavity = True
    sh.cavity_type = 'BOTH'
    sh.cavity_ridge_factor = 0.6
    sh.cavity_valley_factor = 1.4
    sh.curvature_ridge_factor = 0.6
    sh.curvature_valley_factor = 1.2
    r.filepath = base + '_relieve.png'
    bpy.ops.render.render(write_still=True)
    # 3) without the ground: where the objects are.
    bpy.data.objects['Terreno'].hide_render = True
    sh.show_cavity = False
    r.filepath = base + '_objetos.png'
    bpy.ops.render.render(write_still=True)
    rep['size'] = [r.resolution_x, r.resolution_y]
except Exception:
    rep['error'] = traceback.format_exc()
json.dump(rep, open(log, 'w'), indent=1)
