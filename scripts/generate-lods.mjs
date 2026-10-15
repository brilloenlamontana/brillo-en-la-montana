// Genera los niveles de detalle (<Modelo>_LOD1.glb, <Modelo>_LOD2.glb) junto a cada modelo del mapa y de los personajes.
// Simplifica cada malla con meshoptimizer conservando los nombres de nodo (el juego empareja los niveles por nombre)
// y la geometría compartida entre nodos (los pinos, árboles y rocas se dibujan instanciados). En los personajes
// (`textured`) se conservan UV, normales, huesos y pesos: la simplificación solo reescribe los triángulos.
//
// Uso: npm run lods            (todos)
//      npm run lods -- Pinares (solo los modelos cuyo nombre contenga "Pinares")
// Vuelve a correrlo cada vez que se exporte de nuevo uno de estos modelos desde Blender.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { compactPrimitive, prune, simplify, unweld, weld } from '@gltf-transform/functions';
import draco3d from 'draco3d';
import { MeshoptSimplifier } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

// Ángulo hasta el que se suavizan las normales (como el "auto smooth" de Blender): las aristas más marcadas
// quedan duras, así casas y rocas siguen viéndose facetadas y las copas redondas, suaves.
const SMOOTH_ANGLE_COS = Math.cos((40 * Math.PI) / 180);

const MODELS_DIR = 'public/models-3d';

// ratio = fracción de triángulos que se intenta conservar; error = desviación máxima relativa al tamaño de la malla.
const MODELS = [
  { file: 'map/Pinares/Pinares.glb', levels: [{ ratio: 0.45, error: 0.02 }, { ratio: 0.15, error: 0.15 }] },
  { file: 'map/BosqueOscuridad/BosqueArboles.glb', levels: [{ ratio: 0.3, error: 0.02 }, { ratio: 0.08, error: 0.08 }] },
  { file: 'map/BosqueOscuridad/BosqueHongos.glb', levels: [{ ratio: 0.4, error: 0.03 }, { ratio: 0.12, error: 0.2 }] },
  { file: 'map/VillaBoj/Villa.glb', levels: [{ ratio: 0.5, error: 0.01 }, { ratio: 0.2, error: 0.04 }] },
  { file: 'map/VillaBoj/Empalizada.glb', levels: [{ ratio: 0.4, error: 0.01 }, { ratio: 0.15, error: 0.04 }] },
  { file: 'map/CasaImeri/ImeriExterior.glb', levels: [{ ratio: 0.45, error: 0.01 }, { ratio: 0.15, error: 0.04 }] },
  // Personajes y objetos con textura: ~200 mil triángulos cada uno, mucho más de lo que se nota en pantalla.
  // Cada avatar de public/models-3d/avatars entra solo: el juego carga <Avatar>_LOD1.glb y <Avatar>_LOD2.glb.
  ...fs
    .readdirSync(path.join('public/models-3d', 'avatars'))
    .filter((name) => name.endsWith('.glb') && !/_LOD\d+\.glb$/.test(name))
    .map((name) => ({ file: `avatars/${name}`, textured: true, levels: [{ ratio: 0.2, error: 0.004 }, { ratio: 0.05, error: 0.02 }] })),
  { file: 'npcs/Aldeano.glb', textured: true, levels: [{ ratio: 0.2, error: 0.004 }, { ratio: 0.05, error: 0.02 }] },
  { file: 'npcs/Imeri.glb', textured: true, levels: [{ ratio: 0.2, error: 0.004 }, { ratio: 0.05, error: 0.02 }] },
  { file: 'enemies/Golem.glb', textured: true, levels: [{ ratio: 0.2, error: 0.004 }, { ratio: 0.05, error: 0.02 }] },
  { file: 'enemies/Zumbador.glb', textured: true, levels: [{ ratio: 0.25, error: 0.01 }, { ratio: 0.08, error: 0.03 }] },
  { file: 'objects/Card.glb', textured: true, levels: [{ ratio: 0.1, error: 0.01 }] },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;

const countTriangles = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((mesh) => mesh.listPrimitives())
    .reduce((sum, prim) => sum + (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3, 0);

// Las normales y las UV separan cada cara de sus vecinas (todo vértice queda en una "costura") y el simplificador casi
// no puede colapsar nada. Estos modelos no tienen texturas, así que las UV sobran; las normales se recalculan después.
const stripSeamAttributes = () => (doc) => {
  for (const prim of doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives())) {
    prim.setAttribute('NORMAL', null);
    prim.setAttribute('TEXCOORD_0', null);
  }
};

// Agrupa vértices cercanos sin respetar la topología: llega mucho más abajo que simplify() y borra las piezas pequeñas
// sueltas (capas de un pino, hojas), que de lejos no se notan. Pensado para el último nivel.
const simplifySloppy = (ratio, error) => (doc) => {
  for (const prim of doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives())) {
    const indices = prim.getIndices();
    if (!indices) continue;
    const positions = prim.getAttribute('POSITION').getArray();
    const source = new Uint32Array(indices.getArray());
    const target = Math.max(3, Math.floor((source.length * ratio) / 3) * 3);
    const [result] = MeshoptSimplifier.simplifySloppy(source, positions, 3, null, target, error);
    if (result.length >= 3) indices.setArray(new Uint32Array(result));
  }
};

// Espera primitivas sin índices (después de unweld): cada triángulo tiene sus 3 vértices propios.
const smoothNormals = () => (doc) => {
  for (const prim of doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives())) {
    const position = prim.getAttribute('POSITION');
    const count = position.getCount();
    const faceNormals = new Float32Array(count); // una normal por triángulo, repetida en x,y,z del primer vértice
    const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
    const byPosition = new Map();
    for (let i = 0; i < count; i += 3) {
      position.getElement(i, a); position.getElement(i + 1, b); position.getElement(i + 2, c);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      nx /= length; ny /= length; nz /= length;
      faceNormals[i] = nx; faceNormals[i + 1] = ny; faceNormals[i + 2] = nz;
      for (const [k, p] of [[i, a], [i + 1, b], [i + 2, c]]) {
        const key = `${p[0].toFixed(5)},${p[1].toFixed(5)},${p[2].toFixed(5)}`;
        if (!byPosition.has(key)) byPosition.set(key, []);
        byPosition.get(key).push(k);
      }
    }
    const normals = new Float32Array(count * 3);
    for (const corners of byPosition.values()) {
      for (const k of corners) {
        const f = k - (k % 3);
        let sx = 0, sy = 0, sz = 0;
        for (const other of corners) {
          const g = other - (other % 3);
          const dot = faceNormals[f] * faceNormals[g] + faceNormals[f + 1] * faceNormals[g + 1] + faceNormals[f + 2] * faceNormals[g + 2];
          if (dot >= SMOOTH_ANGLE_COS) { sx += faceNormals[g]; sy += faceNormals[g + 1]; sz += faceNormals[g + 2]; }
        }
        const length = Math.hypot(sx, sy, sz) || 1;
        normals[k * 3] = sx / length; normals[k * 3 + 1] = sy / length; normals[k * 3 + 2] = sz / length;
      }
    }
    prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(position.getBuffer()));
  }
};

// Los personajes generados tienen la textura repartida en muchas islas UV: casi todo vértice está en una costura y
// simplify() no logra reducir nada. El modo Permissive deja colapsar a través de las costuras, pero pesa el cambio en
// UV y normales para que la textura no se corra. Los vértices no cambian, así huesos y pesos siguen sirviendo.
const UV_WEIGHT = 1;
const NORMAL_WEIGHT = 0.25;
const simplifyTextured = (ratio, error) => (doc) => {
  for (const prim of doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives())) {
    const indices = prim.getIndices();
    const position = prim.getAttribute('POSITION');
    const normal = prim.getAttribute('NORMAL');
    const uv = prim.getAttribute('TEXCOORD_0');
    if (!indices || !position) continue;
    const count = position.getCount();
    const positions = new Float32Array(count * 3);
    const attributes = new Float32Array(count * 5);
    const p = [0, 0, 0], n = [0, 0, 0], t = [0, 0];
    for (let i = 0; i < count; i++) {
      position.getElement(i, p);
      positions.set(p, i * 3);
      if (normal) normal.getElement(i, n);
      if (uv) uv.getElement(i, t);
      attributes.set([n[0], n[1], n[2], t[0], t[1]], i * 5);
    }
    const source = new Uint32Array(indices.getArray());
    const target = Math.max(3, Math.floor((source.length * ratio) / 3) * 3);
    const weights = [NORMAL_WEIGHT, NORMAL_WEIGHT, NORMAL_WEIGHT, UV_WEIGHT, UV_WEIGHT];
    const [result] = MeshoptSimplifier.simplifyWithAttributes(source, positions, 3, attributes, 5, weights, null, target, error, ['Permissive']);
    indices.setArray(new Uint32Array(result));
    compactPrimitive(prim);
  }
};

const filter = process.argv[2];
for (const { file, levels, textured } of MODELS) {
  if (filter && !file.includes(filter)) continue;
  const source = path.join(MODELS_DIR, file);
  const baseTriangles = countTriangles(await io.read(source));

  for (const [i, { ratio, error }] of levels.entries()) {
    // Se relee el original para que cada nivel salga del modelo completo y no de otro ya simplificado.
    const doc = await io.read(source);
    const isLastLevel = i === levels.length - 1;
    const transforms = textured
      ? [weld(), simplifyTextured(ratio, error), prune({ keepLeaves: true })]
      : [
          stripSeamAttributes(),
          weld(),
          isLastLevel ? simplifySloppy(ratio, error) : simplify({ simplifier: MeshoptSimplifier, ratio, error }),
          unweld(),
          smoothNormals(),
          weld(),
          prune({ keepLeaves: true }),
        ];
    await doc.transform(...transforms);
    doc.createExtension(KHRDracoMeshCompression).setRequired(true);
    const target = source.replace(/\.glb$/, `_LOD${i + 1}.glb`);
    await io.write(target, doc);
    const triangles = countTriangles(doc);
    console.log(`${target}: ${Math.round(triangles)} triángulos (${Math.round((triangles / baseTriangles) * 100)}% de ${Math.round(baseTriangles)})`);
  }
}
