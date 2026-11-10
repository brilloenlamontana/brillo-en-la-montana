# Utilidades GLB sin dependencias (solo libreria estandar): leer, escribir, inspeccionar y adelgazar animaciones.
import json, struct, array

COMP = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}


def read_glb(path):
    with open(path, 'rb') as f:
        data = f.read()
    magic, _version, length = struct.unpack_from('<4sII', data, 0)
    if magic != b'glTF':
        raise ValueError('no es GLB: ' + path)
    off = 12
    js = None
    bin_ = b''
    while off < length:
        clen, ctype = struct.unpack_from('<II', data, off)
        off += 8
        chunk = data[off:off + clen]
        off += clen
        if ctype == 0x4E4F534A:
            js = json.loads(chunk.decode('utf-8'))
        elif ctype == 0x004E4942:
            bin_ = bytes(chunk)
    return js, bin_


def write_glb(path, js, bin_):
    jb = json.dumps(js, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bytes(bin_) + b'\x00' * ((4 - len(bin_) % 4) % 4)
    total = 12 + 8 + len(jb) + ((8 + len(bb)) if bb else 0)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A))
        f.write(jb)
        if bb:
            f.write(struct.pack('<II', len(bb), 0x004E4942))
            f.write(bb)
    return total


def accessor_bytes(js, bin_, i):
    acc = js['accessors'][i]
    bv = js['bufferViews'][acc['bufferView']]
    size = COMP[acc['componentType']][1] * NCOMP[acc['type']]
    stride = bv.get('byteStride', size)
    start = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    if stride == size:
        return bin_[start:start + size * acc['count']]
    return b''.join(bin_[start + k * stride:start + k * stride + size] for k in range(acc['count']))


def anim_info(js, bin_):
    names = [n.get('name', '') for n in js.get('nodes', [])]
    out = []
    for an in js.get('animations', []):
        paths = {}
        tr_nodes = []
        dur = 0.0
        frames = 0
        hips = None
        interp = {}
        for ch in an['channels']:
            p = ch['target']['path']
            paths[p] = paths.get(p, 0) + 1
            s = an['samplers'][ch['sampler']]
            interp[s.get('interpolation', 'LINEAR')] = interp.get(s.get('interpolation', 'LINEAR'), 0) + 1
            ia = js['accessors'][s['input']]
            dur = max(dur, ia['max'][0])
            frames = max(frames, ia['count'])
            node = names[ch['target']['node']]
            if p == 'translation':
                tr_nodes.append(node)
                oa = js['accessors'][s['output']]
                if node == 'mixamorig:Hips' and oa['componentType'] == 5126:
                    raw = accessor_bytes(js, bin_, s['output'])
                    v = struct.unpack('<%df' % (len(raw) // 4), raw)
                    hips = [[round(min(v[k::3]), 4), round(max(v[k::3]), 4)] for k in range(3)]
        out.append({"name": an.get('name'), "channels": len(an['channels']), "paths": paths, "interp": interp,
                    "duration": round(dur, 4), "frames": frames, "hips_translation": hips, "translation_nodes": tr_nodes[:6]})
    return out


def slim_animation(src, dst, keep_translation=('mixamorig:Hips',), quantize=True):
    """Deja solo rotaciones (+ traslacion de los nodos indicados), comparte accesores identicos y cuantiza las
    rotaciones a int16 normalizado. El archivo resultante solo tiene nodos (esqueleto) y animaciones."""
    js, bin_ = read_glb(src)
    if js.get('meshes'):
        raise ValueError('el GLB de animacion no debe llevar mallas: ' + src)
    names = [n.get('name', '') for n in js['nodes']]
    out = bytearray()
    views = []
    accs = []
    cache = {}

    def add(src_acc, raw, comp, normalized=False, minmax=None):
        key = (comp, src_acc['type'], src_acc['count'], normalized, bytes(raw))
        if key in cache:
            return cache[key]
        while len(out) % 4:
            out.append(0)
        views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(raw)})
        out.extend(raw)
        acc = {'bufferView': len(views) - 1, 'componentType': comp, 'count': src_acc['count'], 'type': src_acc['type']}
        if normalized:
            acc['normalized'] = True
        if minmax:
            acc['min'], acc['max'] = minmax
        accs.append(acc)
        cache[key] = len(accs) - 1
        return cache[key]

    for an in js['animations']:
        chans = []
        samps = []
        for ch in an['channels']:
            t = ch['target']
            path = t['path']
            node = names[t['node']]
            if not (path == 'rotation' or (path == 'translation' and node in keep_translation)):
                continue
            s = an['samplers'][ch['sampler']]
            ia = js['accessors'][s['input']]
            oa = js['accessors'][s['output']]
            if ia['componentType'] != 5126 or oa['componentType'] != 5126:
                raise ValueError('se esperaban accesores float')
            ti = add(ia, accessor_bytes(js, bin_, s['input']), 5126, False, (ia['min'], ia['max']))
            raw = accessor_bytes(js, bin_, s['output'])
            interp = s.get('interpolation', 'LINEAR')
            if path == 'rotation' and quantize and interp != 'CUBICSPLINE':
                f = array.array('f')
                f.frombytes(raw)
                q = array.array('h', [max(-32767, min(32767, int(round(v * 32767)))) for v in f])
                to = add(oa, q.tobytes(), 5122, True)
            else:
                to = add(oa, raw, 5126)
            samps.append({'input': ti, 'output': to, 'interpolation': interp})
            chans.append({'sampler': len(samps) - 1, 'target': {'node': t['node'], 'path': path}})
        an['channels'] = chans
        an['samplers'] = samps
    for key in ('meshes', 'materials', 'skins', 'textures', 'images', 'samplers', 'cameras', 'extensionsUsed', 'extensionsRequired'):
        js.pop(key, None)
    for n in js['nodes']:
        n.pop('mesh', None)
        n.pop('skin', None)
    js['accessors'] = accs
    js['bufferViews'] = views
    js['buffers'] = [{'byteLength': len(out)}]
    return write_glb(dst, js, out)


def describe(path):
    """Resumen de un GLB: nodos, mallas (bbox de POSITION), pieles, imagenes, extensiones y animaciones."""
    js, bin_ = read_glb(path)
    d = {"nodes": [n.get('name') for n in js.get('nodes', [])], "n_nodes": len(js.get('nodes', [])),
         "extensionsUsed": js.get('extensionsUsed', []), "extensionsRequired": js.get('extensionsRequired', []),
         "skins": [len(s.get('joints', [])) for s in js.get('skins', [])], "meshes": [], "images": [],
         "materials": [[m.get('name'), m.get('alphaMode', 'OPAQUE'), bool(m.get('doubleSided'))] for m in js.get('materials', [])],
         "animations": anim_info(js, bin_), "bin_bytes": len(bin_)}
    for m in js.get('meshes', []):
        for p in m.get('primitives', []):
            acc = js['accessors'][p['attributes']['POSITION']]
            d["meshes"].append({"name": m.get('name'), "verts": acc['count'], "min": acc.get('min'), "max": acc.get('max'),
                                "draco": 'KHR_draco_mesh_compression' in p.get('extensions', {}), "attrs": sorted(p['attributes']),
                                "indices": js['accessors'][p['indices']]['count'] if 'indices' in p else None})
    for im in js.get('images', []):
        bv = js['bufferViews'][im['bufferView']] if 'bufferView' in im else None
        d["images"].append([im.get('name'), im.get('mimeType'), bv['byteLength'] if bv else None])
    return d
