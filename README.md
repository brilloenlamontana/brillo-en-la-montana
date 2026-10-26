# Brillo en la montaña

Juego 3D educativo de la Universidad del Valle. El jugador recorre Villa de Boj y atraviesa tres desafíos (Pantano de la
Tristeza, Bosque de la Oscuridad, Túneles de la Cumbre) hasta el relato de cierre en la Cumbre de la Desolación.

**Stack:** React 19 · React Three Fiber 9 + drei · three.js 0.185 con **WebGPU** · Rapier (física) · ecctrl (personaje) ·
zustand (estado) · Firebase (Auth con Google, Firestore) · Vite 8 · TypeScript estricto · Tailwind 4 · oxlint.

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completar con los datos del proyecto de Firebase
npm run dev            # servidor de desarrollo
npm run build          # tsc estricto + build de producción en dist/
npm run lint           # oxlint
```

El navegador debe soportar **WebGPU** (Chrome/Edge recientes, Safari 26+). Si no lo soporta, el juego muestra un aviso en
lugar del mundo: no hay respaldo a WebGL.

## Arquitectura

Monolito en capas. Las dependencias van en un solo sentido, de arriba hacia abajo:

```
pages ──► game (challenges ──► player / world ──► engine) ──► store / services ──► data
```

```
src/
├─ main.tsx                 Punto de entrada
├─ app/                     Raíz de composición: rutas (con carga diferida), sesión y flujo de ingreso
│  ├─ App.tsx
│  ├─ useAuthSession.ts     Único lugar que escucha a Firebase Auth y carga perfil + progreso
│  └─ onboarding.ts         login → registro → personaje → mundo (cada página redirige según el paso)
├─ pages/                   Una por ruta: Login, CharacterSelection, World, Admin
├─ components/              UI fuera del juego (login, menú de usuario, modales de registro/perfil/Ley 1581)
├─ services/                Toda la E/S con Firebase. Ningún componente importa firebase directamente
│  ├─ firebase.ts           Inicialización
│  ├─ userService.ts        Perfil, registro, personaje, inicio/cierre de sesión
│  ├─ progressService.ts    Guardado del progreso (store al instante, Firestore en segundo plano)
│  └─ adminService.ts       Panel de administración
├─ store/                   Estado global sin E/S: sesión, progreso, diálogo abierto, avisos
├─ data/                    Catálogos locales: sedes/facultades/programas y personajes
├─ hooks/                   Hooks de la app (useIsMobile)
└─ game/                    Todo el mundo 3D
   ├─ GameCanvas.tsx        <Canvas> WebGPU: mapa compartido + cada desafío del registro + jugador
   ├─ engine/               Motor genérico, sin conocimiento de la historia
   │  ├─ rendering/         Renderer WebGPU, resolución adaptativa, estado de carga
   │  ├─ physics/           Cuboides (CuboidColliders, colliderBoxes, trunkColliders), puertas físicas, altura del terreno
   │  ├─ models/            StaticModel, InstancedField, fusión de mallas, terreno por bloques
   │  ├─ camera/            Obstáculos de la cámara en tercera persona
   │  ├─ interaction/       Npc genérico, objetos recogibles, tecla E, cercanía del jugador
   │  └─ geometry/          Polígonos y zonas circulares
   ├─ world/                El mapa como un todo
   │  ├─ mapa/              Colección "Mapa" de Map.blend: terreno, límites, pinos, rocas
   │  ├─ geography.ts       Formas de cada región (medidas en Map.blend)
   │  ├─ regions.ts         Región/casa donde está el jugador
   │  ├─ visibility.ts      Qué se dibuja desde cada región (visibleFrom, useVisibleFrom)
   │  ├─ ZoneTracker.tsx    Clasifica la posición del jugador cada cuadro
   │  └─ Warmup.tsx         Precalienta materiales región por región detrás de la pantalla de carga
   ├─ player/               Avatar, controlador (ecctrl), cámara, muerte y reaparición
   ├─ hud/                  Capa 2D sobre el canvas: vida, mochila, controles táctiles, diálogos tipo pergamino
   └─ challenges/
      ├─ types.ts           Contrato Challenge (World, Dialogs, Hud, backpack, regions, startPoint, isCompleted)
      ├─ registry.ts        Lista ordenada de desafíos: lo único que el juego conoce de ellos
      ├─ progression.ts     Desafío en curso y bajos (qué se pierde y dónde reaparece al morir)
      ├─ desafio1/          Pantano de la Tristeza (con lógica completa)
      ├─ desafio2/          Bosque de la Oscuridad (el elfo, su casa, su mochila, los duendes y las frutas con el lente)
      ├─ desafio3/          Túneles de la Cumbre (solo se renderiza)
      └─ relatoCierre/      Cumbre y santuario (solo se renderiza)
```

### Anatomía de un desafío

Cada carpeta de `challenges/` es autocontenida (alta cohesión) y solo depende de `engine`, `world`, `player`, `hud` y los
stores (bajo acoplamiento). Ejemplo, `desafio1/`:

| Archivo | Responsabilidad |
| --- | --- |
| `index.ts` | Exporta el `Challenge`: título, mundo 3D, diálogos y mochila |
| `Desafio1World.tsx` | Compone las piezas 3D del desafío |
| `Desafio1Dialogs.tsx` | Diálogos DOM sobre el canvas |
| `Desafio2Hud.tsx` (opcional) | HUD propio del desafío sobre el canvas (p. ej. la barra de hambre y la vista del lente) |
| `assets.ts` | Rutas de todos los GLB e imágenes que carga |
| `visibility.ts` | Desde qué regiones se dibuja cada pieza y dónde choca la cámara |
| `mission.ts` | Reglas puras sobre el progreso (sin React ni three): las usa el juego **y** el panel de admin |
| `items.ts` | Objetos recogibles y alcances de uso |
| `backpack.ts` | Mochila del desafío: estados de cada objeto y efecto al usarlo |
| `dialogs.ts` | Ids de sus diálogos |
| `pantanoStore.ts` | Estado vivo del pantano (enemigos, lodo, pozo) |
| `villaDeBoj/`, `casaDeImeri/`, `pantanoTristeza/` | Lugares (espejo de las colecciones de Map.blend) |
| `npcs/`, `enemies/`, `cartaAlcalde/` | Personajes, enemigos y objetos interactivos |

### Flujo de la historia

1. **Inicio:** la primera vez que se entra al mundo, la carta del alcalde se abre sola.
2. **Aldeano** (plaza de Villa Boj): cuenta lo que pasó y pregunta si necesitas ayuda. Con **No**, Imeri no aparece y su
   casa sigue cerrada; se le puede volver a preguntar al salir y regresar.
3. **Imeri** espera frente a su casa, con la puerta cerrada. Con **Sí**, la puerta se abre y la mochila se activa: gema,
   soga y 5 pociones (que forman el insecticida).
4. **Pantano:** el golem y los zumbadores despiertan al pisar el lodo y quitan vida. La gema apaga al golem, el
   insecticida acaba con los zumbadores, la soga saca de un pozo. Cada objeto desaparece al cumplir su función.
5. **Desafío 1 completado** (golem + 10 zumbadores): los pozos se tapan para siempre y ya no se dibujan, y aparece el
   aviso de pantano superado.
6. **Elfo** (solo después del desafío 1): explica los peligros del bosque. Con **Sí**, su puerta se abre y la mochila
   cambia a sus herramientas (espada, lente, mapa).
7. **Duendes** (Bosque de la Oscuridad): 6 duendes esperan repartidos por el bosque. Al entrar te persiguen, cada uno
   con su velocidad y rodeándote desde un ángulo distinto, y te golpean de cerca. La espada (clic o tecla 1, como el
   insecticida) derriba a todos los que estén a su alcance; al caer el último, la espada sale de la mochila.
8. **Hambre y frutas** (Bosque de la Oscuridad): dentro del bosque se vacía la barra de hambre y, vacía, quita vida. Las
   90 frutas del bosque se ven rojas; cerca de un tercio son buenas (siempre las mismas, `isFrutoBueno` en
   `mission.ts`). El lente (tecla 2) se enciende y apaga: con él puesto, las buenas cercanas se ven amarillas. Comer
   una buena (E o tocar) llena la barra y da vida; una venenosa mata (un bajo). Tras comer 3 buenas se acaba el hambre
   y el lente sale de la mochila.

**Bajos (vidas):** hay 3 estrellas para todo el juego, como el rendimiento académico. Morir es caer en un bajo:

| Bajo | Qué pasa |
| --- | --- |
| Primero | Reapareces al inicio del desafío donde caíste (`startPoint`: Villa Boj, casa del elfo, pueblo…) con todo tu progreso |
| Segundo | Vuelves a Villa Boj y se pierde toda la historia (desafío 1, 2…): se empieza desde cero |
| Tercero | Sales de la carrera: se borra el personaje, eliges otro avatar y empiezas con 3 estrellas |

El desafío "donde caíste" se decide por la región (`regions` de cada `Challenge`). El panel de admin muestra estrellas,
derrotas por desafío y cuántos segundos y terceros bajos tuvo cada estudiante.

### Cómo añadir un desafío

1. Crear `src/game/challenges/<nombre>/` con `assets.ts`, `visibility.ts`, `<Nombre>World.tsx` e `index.ts` que exporte
   un `Challenge` (ver `types.ts`).
2. Si tiene diálogos, exportar `Dialogs`; si tiene mochila, implementar `Backpack` (como `desafio1/backpack.ts`). La
   mochila visible es la del último desafío cuya `isActive` sea verdadera.
3. Definir `regions` (dónde se juega), `startPoint` (dónde reaparece tras un primer bajo) e `isCompleted` (cuándo pasa
   al siguiente).
4. Si tiene reglas, escribirlas como funciones puras en `mission.ts` y agregar sus campos a `GameProgress`
   (`store/progressStore.ts`).
5. Si introduce una región nueva del mapa, añadir su forma en `world/geography.ts` y su caso en `world/regions.ts`.
6. Agregarlo a `CHALLENGES` en `registry.ts`. El canvas, los diálogos y la mochila lo toman de ahí: no hay que tocar nada más.

## Reglas del proyecto

- **Modelos:** todos salen de `Map.blend` (una carpeta por colección en `public/models-3d/map`), ya ubicados en
  coordenadas de mundo. glTF (x, y, z) = Blender (x, z, −y).
- **Colisiones:** solo cuboides y solo donde el avatar camina o choca (`CuboidColliders`). El único GLB de colisión es
  `LimiteMapa`. El terreno es una sola malla trimesh.
- **Puertas** (`PhysicsDoor`): cuerpos cinemáticos. Nada las mueve salvo el avatar al chocar con la hoja; giran hacia el
  lado contrario a él y se quedan donde las dejó. Bloqueadas (`locked`) quedan cerradas y no ceden. La caja de cada hoja
  se mide con sus vértices en su dirección real (`doorLeaf.ts`), aunque el nodo esté modelado en diagonal.
- **Calidad de imagen** (`engine/rendering/resolution.ts`): la resolución sigue al `PerformanceMonitor` (factor gradual,
  solo después de cargar), con MSAA y supermuestreo en escritorio y filtrado anisotrópico en todas las texturas.
- **Rendimiento:**
  - Nada se dibuja desde donde no se ve (`visibility.ts` de cada desafío).
  - Lo repetido va instanciado (`InstancedField`) y lo estático se fusiona por material (`merge`).
  - Las suscripciones a stores usan selectores: moverse nunca re-renderiza React.
  - La resolución se adapta al rendimiento (`AdaptiveResolution`), sin antialiasing.
  - Sin `backdrop-blur` sobre el canvas.
- **Estado:** posiciones y valores por cuadro se mutan en `useFrame` y se leen con `getState()`; los stores solo
  notifican cambios discretos (región, vida, diálogo, progreso).
- **Seguridad:** las comprobaciones de administrador en el cliente solo deciden qué se muestra. La protección real son
  las **reglas de Firestore**: leer todos los usuarios y escribir `role` solo para administradores; cada jugador solo
  escribe su propio documento.

## Pendientes conocidos

- Solo existe el modelo 3D de **Elfa**; los demás personajes se dibujan con él hasta exportar los suyos
  (`data/characters.ts`).
- El avatar y los NPC tienen muchos polígonos para teléfonos: conviene una versión optimizada desde Blender.
