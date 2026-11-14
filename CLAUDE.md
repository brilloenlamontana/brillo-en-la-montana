# CLAUDE.md — Brillo en la montaña

## 1. PRIMERA INSTRUCCIÓN OBLIGATORIA: `graphify` (Leer primero, actualizar SOLO cuando el usuario lo pida)

Este proyecto tiene un grafo de conocimiento persistente en `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`) con *god nodes*, detección de comunidades y relaciones entre archivos.

Cuando el usuario escriba `/graphify`, usa la skill `graphify` instalada antes de hacer cualquier otra cosa.

### Reglas de lectura y actualización del grafo:
1. **Leer `graphify` como primer paso siempre:** Cuando exista `graphify-out/graph.json`, ejecuta `graphify query "<pregunta>"` **antes** de tu primer `Grep`, `Glob`, búsqueda o lectura de archivos fuente ante cualquier consulta o tarea sobre el código, arquitectura o relaciones, e incluye esta misma regla en el prompt de todo subagente que explore el repositorio:
   - `graphify query "<pregunta>"` — contexto relevante acotado del grafo.
   - `graphify path "<A>" "<B>"` — relación y camino entre dos módulos, símbolos o conceptos.
   - `graphify explain "<concepto>"` — detalle puntual de un nodo.
   - Si existe `graphify-out/wiki/index.md`, úsalo para navegación amplia antes de recorrer carpetas manualmente.
   - Lee `graphify-out/GRAPH_REPORT.md` únicamente para revisiones globales de arquitectura o cuando `query`/`path`/`explain` no basten, y abre archivos crudos solo en las rutas/líneas ubicadas por el grafo.
   - Archivos modificados en `graphify-out/` tras hooks o actualizaciones incrementales son normales; nunca omitas `graphify` para lecturas salvo que el usuario lo pida explícitamente.
2. **NO actualizar `graphify` automáticamente (solo bajo petición explícita del usuario):** **PROHIBIDO ejecutar `graphify update .` o `/graphify` por cuenta propia tras cada cambio o ciclo de prueba y error**, porque consume muchos tokens y tiempo en cada iteración. **El usuario es quien indica cuándo actualizar `graphify`**; ejecútalo única y exclusivamente cuando el usuario lo pida de forma explícita:
   - Cuando el usuario lo solicite para cambios en código fuente: ejecuta `graphify update .` (solo AST, incremental y sin costo de API).
   - Cuando el usuario lo solicite incluyendo documentación (`.md`, `.html`), imágenes/sprites o arquitectura semántica: ejecuta `/graphify . --update` (o `/graphify .` para reconstrucción completa).

---

## 2. Protección de la Base de Datos Real durante Pruebas (Sin Excepciones)

**PROHIBIDO eliminar, vaciar, truncar, reiniciar o sobrescribir destructivamente cualquier dato de la base de datos real (Firebase Auth / Cloud Firestore configurada en `.env`) al realizar pruebas, depuración, scripts o verificaciones sin confirmación explícita previa del usuario.**

- La colección `users/{uid}` en Firestore (`src/services/firebase.ts`, `userService.ts`, `progressService.ts`, `adminService.ts`) contiene datos reales de estudiantes, consentimientos de Ley 1581, roles (`admin` / `student`), avatares y progreso académico/juego.
- **Nunca ejecutes sin pedir y recibir confirmación explícita del usuario:**
  - `deleteDoc`, borrados masivos/lotes, eliminación de usuarios en Firebase Auth o `setDoc` sin `{ merge: true }` contra Firestore real.
  - Acciones o pruebas que borren campos (`deleteField()`, `clearCharacter`) o reinicien progreso real (p. ej. simular un *segundo bajo* o *tercer bajo* conectado a una sesión real).
- **Pruebas seguras por defecto:**
  - En pruebas con navegador (Google Chrome), **usa siempre el modo sandbox `?dev=<preset>`** (ver sección 4), que inyecta `DEV_USER_UID = 'dev-local-tester'` en memoria sin tocar Firebase Auth ni Cloud Firestore.
  - Prueba la lógica sobre funciones puras (`mission.ts`, `progression.ts`) y estado en memoria de Zustand (`useProgressStore`, `useAuthStore`).
  - Usa *mocks/stubs* de `src/services/*` o **Firebase Local Emulator Suite** para pruebas automatizadas; jamás apuntes scripts destructivos al proyecto real definido en `.env`.

---

## 3. Comandos y Arquitectura Rápida

```bash
npm run dev           # Servidor de desarrollo Vite
npm run build         # tsc -b (TypeScript estricto) + vite build
npm run lint          # oxlint
npm run tuneles:fisica  # Regenera muros/bloques/parches/puente de los túneles desde los GLB (escribe tunelColliderData.ts)
npm run docker:dev    # Contenedor Docker dev en http://localhost:5174 (alterna desde prod)
npm run docker:prod   # Contenedor Docker prod (Nginx) en http://localhost:8081 (alterna desde dev)
```

- **Capas unidireccionales:** `pages ──► game (challenges ──► player / world ──► engine) ──► store / services ──► data`.
- **WebGPU con respaldo a WebGL 2:** Renderizado con `three` + `@react-three/fiber` sobre el `WebGPURenderer`. Si el equipo no ofrece WebGPU, el mismo renderer dibuja con WebGL 2 (`rendering/backend.ts` decide una vez por visita; `window.__DEV_GAME__.status().backend` dice cuál). Los shaders están en TSL y three los compila a WGSL o GLSL: **no escribir GLSL ni WGSL a mano**. en WebGL se ve igual (resolución de la pantalla y MSAA: `rendering/resolution.ts`), solo sin supermuestreo ni grano de detalle en el terreno, y, si WebGPU pierde la tarjeta gráfica, el juego lo recuerda 7 días (`localStorage` `brillo.webgpuFallo`) y recarga solo en WebGL; `?render=webgpu` olvida ese fallo y `?render=webgl` fuerza WebGL para probar (combinable: `/mundo?dev=villa&render=webgl`). Plan y fases pendientes en `docs/Plan_Respaldo_WebGL.md`.
- **Firebase encapsulado:** Solo `src/services/` interactúa con Firebase; ningún componente o módulo del motor importa `firebase/*`.
- **Desafíos modulares:** Cada carpeta en `src/game/challenges/` (`desafio1`, `desafio2`, `desafio3`, `relatoCierre`) implementa el contrato `Challenge` (`types.ts`) y se conecta en `registry.ts`.
- **Física de los túneles (Desafío 3):** solo se modela el suelo (`TunelSueloColision` en `TunelesColision.glb`, trimesh). Todo lo demás lo genera `npm run tuneles:fisica` (`scripts/tuneles-fisica.mjs` → `tunelColliderData.ts`, **generado, no editar a mano**) desde los modelos: muros sobre todo el borde del suelo, un bloque por cada cosa de pie en medio de una galería, parches de suelo sobre las ranuras y, para el puente (`DECKS`: nodo `TunelPuente`), una rampa lisa con dos barandas. El script falla sin escribir nada si un borde queda sin muro o si aparece una abertura fuera de la boca de la mina y del pozo de salida. Tras cambiar los túneles en `Map.blend`: exportar los GLB y volver a correr el comando.
- **Video introductorio:** `WorldPage` muestra `IntroVideo` (`src/game/hud/IntroVideo.tsx`) en lugar del mundo mientras `progress.introVista` sea falso; al terminar guarda `introVista: true` y el mundo carga. Se ve una sola vez por jugador (no vuelve tras un bajo; quien ya había leído el anuncio del alcalde no lo ve) y no se puede saltar. El archivo es `public/video/video-introductorio.mp4` (H.264 + AAC, 720×720; el original sin comprimir está en `docs/`, fuera de git).
- **Gestos con destinatario:** un objeto de la mochila puede declarar `aim` (`BackpackItem` en `challenges/types.ts`): mientras dura su gesto el avatar gira hacia ese punto (`gestureAim` en `player/gestureStore.ts`, `faceGestureAim` en `Avatar.tsx`). Lo usa la muñeca (`quienRecibeMuneca` en `desafio3/espectro/muneca.ts`).
- **Vegetación y viento:** las hojas se mueven con un shader TSL (`engine/rendering/vegetation.ts`), que `glowMaterials.ts` aplica por nombre de material (`PinoFollaje`, `BosqueFollaje`, `PantanoJunco`, `PantanoEspadana`): se doblan en ráfagas que cruzan el mapa, más cuanto más alto está el vértice en su modelo. El **pasto** (`world/mapa/Pasto.tsx`, `engine/models/grassField.ts`) se reparte una sola vez sobre los triángulos del terreno según sus máscaras (`color_1`: r lodo, g camino, b suelo de bosque) y un único `InstancedMesh` dibuja las matas alrededor de la cámara (hasta 6000, se hunden en el suelo a lo lejos); no crece en lodo, caminos, por encima de 46 m, ni se dibuja en interiores, túneles o cumbre. En el pantano crecen juncos, espadañas y ramas secas (colección `PantanoVegetacion` de `Map.blend`, `PantanoVegetacion.tsx`, sin colisión). Con el mundo recuperado (`vegetation.recovered`, lo fija `MundoRecuperado`) hojas, juncos y pasto se vuelven verdes.
- **Colisión de árboles:** en el Bosque de la Oscuridad cada árbol tiene unas 25 cajas con su tronco y sus raíces altas (`lowBarkBoxes` en `engine/physics/trunkColliders.ts`: la corteza entre el suelo y 2,4 m; las raíces de menos de 0,55 m se pisan). Los duendes, que caminan por código, rodean esas mismas cajas (`bosqueOscuridad/obstaculos.ts`). Cada pino tiene un cuboide del ancho de sus ramas bajas, del suelo a la punta (`foliageBox`).
- **Física y rendimiento:** Colisiones por cuboides (`CuboidColliders`, salvo `Terreno` y `LimiteMapa`), visibilidad por región (`visibility.ts`), `InstancedField` para objetos repetidos, mallas estáticas fusionadas (`merge`), selectores en Zustand y sin `backdrop-blur` sobre el canvas.

---

## 4. Verificación (`lint`) y Pruebas en Google Chrome (`?dev=<preset>`)

> **REGLA DE FLUJO DE TRABAJO — PROHIBIDO PROBAR EN CHROME POR CUENTA PROPIA:**
> - **NO abras ni pruebes en Google Chrome automáticamente** después de hacer cambios (ni con Chrome DevTools MCP, ni con `/browser`, ni con Playwright/Puppeteer). **Las pruebas en Chrome las realiza exclusivamente el usuario** para evitar el alto consumo de tokens y tiempo en cada ciclo de prueba y error.
> - **Cómo verificar tus cambios:** Al terminar de editar código, **ejecuta únicamente `npm run lint` (y `npx tsc -b` cuando aplique)** para comprobar que no haya errores, e indícale al usuario la URL `?dev=<preset>` para que él la pruebe.
> - **Única excepción:** Solo conecta o abre Chrome si el usuario lo solicita explícitamente en su mensaje (por ejemplo, al capturar evidencias para los informes contractuales con `informes-contrato`).

El motor requiere **Google Chrome real con soporte WebGPU** sobre `http://localhost:5174` (`npm run dev` o `npm run docker:dev`). En modo desarrollo (`import.meta.env.DEV`, eliminado por Vite en producción) existe `src/app/devSession.ts` para entrar al juego sin Google OAuth (`@correounivalle.edu.co`) y **sin leer ni escribir jamás en Cloud Firestore real**:

1. **Solo si el usuario solicita explícitamente conectar Google Chrome desde Claude / automatización:**
   - Usa **Chrome DevTools MCP** conectado a Google Chrome local, o lanza Chrome real con soporte GPU (`channel: 'chrome'` en Playwright/Puppeteer, evitando Chromium headless sin adaptador WebGPU).
   - Abre siempre las rutas con `?dev=<preset>`: `useAuthSession.ts` omite `onAuthStateChanged` y `isDevUser` (`authStore.ts`) bloquea toda lectura/escritura a Firestore en `progressService.ts`, `userService.ts` y `adminService.ts`.
2. **URLs completas y casos de prueba disponibles (`http://localhost:5174`):**
   - **Desafío 1 — Villa de Boj, Casa de Imeri y Pantano de la Tristeza:**
     - `http://localhost:5174/mundo?dev=1` (alias: `http://localhost:5174/mundo?dev=villa`, `http://localhost:5174/mundo?dev=desafio1`) — Puerta de Villa de Boj desde cero (`x: -39, y: 12.4, z: 18`).
     - `http://localhost:5174/mundo?dev=intro` — **Primera visita al mundo:** se reproduce el **video introductorio** a pantalla completa (`public/video/video-introductorio.mp4`, `src/game/hud/IntroVideo.tsx`) antes de montar el mundo; no se puede saltar. Al terminar se guarda `introVista: true` y el mundo carga en la puerta de Villa de Boj. Todos los demás presets entran con `introVista: true` (sin video).
     - `http://localhost:5174/mundo?dev=carta` — A unos pasos del tablón de anuncios junto al portón (`x: -45, y: 12.2, z: 19.9`), anuncio sin leer: acércate y presiona `E` para leerlo (nunca se abre solo).
     - `http://localhost:5174/mundo?dev=aldeana` — Junto al pozo de la plaza frente a la aldeana (`x: -74.8, y: 12.2, z: 20.4`, carta leída): cuenta lo ocurrido y pregunta si necesitas ayuda (Sí/No).
     - `http://localhost:5174/mundo?dev=aldeanaPistas` — Frente a la aldeana con su ayuda ya aceptada: cuenta las habladurías del pozo (pistas de los bonos).
     - `http://localhost:5174/mundo?dev=imeriHablar` — Frente a la casa de Imeri con ayuda de la aldeana aceptada, listo para hablar con Imeri.
     - `http://localhost:5174/mundo?dev=imeri` — Frente a la casa de Imeri (`x: 14.5, y: 11.8, z: 41`), puerta desbloqueada y mochila activa para entrar a recoger los 7 objetos.
     - `http://localhost:5174/mundo?dev=pantano` — Orilla seca antes del Pantano (`x: 50, y: 12.2, z: 24`) con **gema, soga e insecticida (5 pociones)** listos en la mochila.
     - `http://localhost:5174/mundo?dev=pantanoCasi` — Pantano con Golem apagado y `9/10` zumbadores derrotados: derrota al último zumbador para disparar la victoria del Desafío 1 en vivo.
     - `http://localhost:5174/mundo?dev=pantanoSuperado` — Pergamino y narración de **Pantano de la Tristeza superado** abiertos (`desafio1.pantanoSuperado`).
   - **Bono 1 — La Estatua de la Choza (salida del pantano):**
     - `http://localhost:5174/mundo?dev=choza` — Etapa 1: afuera, junto a la puerta de la choza de la estatua cubierta de moho (`x: -62, y: 9.9, z: -87.5`).
     - `http://localhost:5174/mundo?dev=chozaEstatua` — Etapa 1 jugable: dentro de la choza frente a la estatua (`x: -61.4, y: 9.9, z: -95.6`): `E` la examina y luego el avatar sube a la losa (los personajes bajos, a un banquito) y limpia el rostro a mano; mantén presionado el clic o `E` para frotar las 3 zonas de moho.
     - `http://localhost:5174/mundo?dev=chozaLimpia` — Etapa 2 jugable: rostro ya limpio (`estatuaLimpia: true`), diálogo abierto; su botón (o `E` junto a la estatua) hace que el avatar se arrodille junto al plato y golpee dos piedras de chispa: haz clic varias veces seguidas para sacar chispas y prender el fuego.
     - `http://localhost:5174/mundo?dev=chozaEncendida` — Etapa 3 jugable: fuego encendido en el plato (`estatuaEncendida: true`), diálogo abierto; su botón (o `E` junto a la estatua) hace que el avatar rodee el fuego, tome el **Anillo de oro** de las manos de la estatua y lo alce para mirarlo; al terminar recibe la **1.ª estrella extra**.
     - `http://localhost:5174/mundo?dev=bono1` — Bono 1 completado (`anilloOro` en mochila + `1 estrella extra`).
     - **Estados de la choza (Bono 1)** — código en `src/game/challenges/desafio1/chozaEstatua/`; plan y avance en `docs/Plan_Bono1_Estatua.md`:

       | Estado guardado (`progress`) | Aviso con `E` junto a la estatua | Qué se ve | Preset |
       |---|---|---|---|
       | Nada hecho, sin examinar | «examinar la estatua» (abre el diálogo de la inscripción) | Moho en rostro (`EstatuaMohoFrente/Ojos/Boca`) y cuerpo (`EstatuaMohoCuerpo`); trapo sobre la losa; pedernal y pirita junto al plato; plato apagado | `?dev=choza`, `?dev=chozaEstatua` |
       | Examinada en esta sesión (`useChozaStore.examinada`, no se guarda) | «limpiar el rostro de la estatua» | Igual | — |
       | `estatuaLimpia: true` | «encender el fuego en el plato» | Rostro limpio; moho del cuerpo; plato apagado | `?dev=chozaLimpia` |
       | `estatuaEncendida: true` | «tomar el anillo de la estatua» | Fuego encendido con luz y sonido (`obj_fogata`); sin moho; anillo en las manos de la estatua | `?dev=chozaEncendida` |
       | `bono1Completado: true` (+ `anilloOro` en `collectedItems`, `vidasExtra` +1) | «contemplar la estatua» | Fuego encendido; manos vacías | `?dev=bono1` |

       Escenas en curso (solo en memoria, `useChozaStore`; mientras duran, la cámara es fija, el avatar lo mueve la escena y salir o abrir un diálogo las cancela sin guardar):
       - `limpieza` (`limpieza.ts`, `LimpiezaEscena`, `LimpiezaHud`): `camino` (rodea el plato hasta la losa) → `frota` (mantener clic/`E`; palma con trapo contra el rostro; 3 zonas de ~4 s; `limpiezaViva.avance` 0‥3; los personajes bajos suben a un banquito) → `fin` → guarda `estatuaLimpia` y abre el diálogo.
       - `encendido` (`encendido.ts`, `EncendidoEscena`, `EncendidoHud`): `camino` (al borde del plato, que es sólido) → `agacha` (clip `Arrodillarse`) → `chispa` (clics: golpe de pirita contra pedernal, chispas; `encendidoVivo.brasa` 0‥1 que se enfría sola) → `llamas` (suben alrededor de la estatua, queman `EstatuaMohoCuerpo`; el avatar se aparta y queda mirando el fuego) → guarda `estatuaEncendida` y abre el diálogo.
       - `anillo` (`anillo.ts`, `AnilloEscena`, `AnilloHud`): `camino` (rodea el fuego) → `alcanza` (mano derecha sobre el anillo, izquierda debajo) → `alza` (el anillo pasa a la mano y lo sube a los ojos) → `mira` (lo gira a la luz del fuego) → guarda `bono1Completado`, la estrella extra y el anillo, y abre el diálogo final (con `05_narrador_05`).
   - **Desafío 2 — Casa del Elfo y Bosque de la Oscuridad:**
     - `http://localhost:5174/mundo?dev=desafio2` (alias: `http://localhost:5174/mundo?dev=elfo`) — Pie del árbol gigante frente al Elfo (`x: -36.4, y: 11.9, z: -122.5`) tras superar el Desafío 1.
     - `http://localhost:5174/mundo?dev=elfoCasa` — Ayuda del Elfo aceptada y puerta de su casa abierta en la copa del árbol para subir a recoger espada, lente y mapa.
     - `http://localhost:5174/mundo?dev=bosque` — Entrada del Bosque de la Oscuridad (`x: -25, y: 13.3, z: -182`) con **espada élfica, lente revelador y mapa del bosque** en la mochila.
     - `http://localhost:5174/mundo?dev=bosqueFrutas` — Bosque con los 6 duendes derrotados y `2/3` frutas buenas comidas: usa el lente (`2`) y come 1 fruta amarilla más.
     - `http://localhost:5174/mundo?dev=bosqueMuro` — Frente al muro oculto de roca (`x: 11, y: 15.2, z: -193`) con duendes derrotados y hambre saciada: presiona `3` (mapa) para bajar el muro, activar el sendero dorado y completar el Desafío 2.
     - `http://localhost:5174/mundo?dev=bosqueSuperado` — Pergamino y narración de **Bosque de la Oscuridad superado** abiertos (`desafio2.bosqueSuperado`).
   - **Bono 2 — El Claro del Hada (salida del bosque):**
     - `http://localhost:5174/mundo?dev=claro` — Llegada: borde del Claro del Hada (`x: 40, y: 16, z: -221.5`) con la espada élfica. La lucecita llama con tres destellos y una campanita, y unas luciérnagas guían hasta el claro. El hada se encoge de miedo si llegas corriendo y se calma si caminas; ya calma, pide ayuda.
     - `http://localhost:5174/mundo?dev=claroSinEspada` — Claro del Hada **sin la espada élfica**: al intentar cortar, el hada misma te dice que se la pidas al elfo.
     - `http://localhost:5174/mundo?dev=claroZarzas` — Etapa 1 jugable: junto al primer nudo de la trampa de zarzas, con la espada élfica: `E` hace que el avatar saque la espada y camine a cada uno de los **tres tallos**; la luz del hada baja por el tallo como un pulso y hay que dar el tajo (clic, toque o `E`) **justo cuando el nudo brilla**. Un tajo a destiempo rebota, las zarzas se aprietan, el hada se queja y se repite ese nudo (tras dos fallos el brillo dura más).
     - `http://localhost:5174/mundo?dev=claroManos` — Etapa 2 jugable: los tres tallos ya cortados (solo en memoria) y el hada caída en el suelo: `E` («ayudar al hada») hace que el avatar se arrodille y le tienda la mano; **mantén presionado** el clic o `E` hasta que sus alas brillen y **suelta** para que despegue. El claro despierta: sus luces se encienden en anillo desde el pedestal.
     - `http://localhost:5174/mundo?dev=hadaLibre` — Etapa 3 jugable: hada libre (`hadaLiberada: true`) y claro despierto; las raíces del atril se abren y ella espera junto a él con su amuleto. `E` («recibir el amuleto del hada»): el avatar pone una rodilla en tierra, ella se lo cuelga al cuello y celebra; al terminar recibe la **2.ª estrella extra**.
     - `http://localhost:5174/mundo?dev=bono2` — Bono 2 completado (`amuletoHada` en mochila + `1 estrella extra`): el hada vuela sobre el claro y se le puede hablar.
     - **Estados del claro (Bono 2)** — código en `src/game/challenges/desafio2/claroDelHada/`; plan y avance en `docs/Plan_Bono2_Hada.md`:

       | Estado | Aviso con `E` | Qué se ve | Preset |
       |---|---|---|---|
       | Nada hecho | «cortar las zarzas con la espada» | Hada en el pedestal bajo la jaula (`Asustada` / `Atrapada`); tres tallos `ZarzaTallo/Nudo/Tocon A, B, C`; luces del claro dormidas; raíces del atril cerradas sobre el amuleto | `?dev=claro`, `?dev=claroZarzas` |
       | Tres tallos cortados en esta sesión (`rescateVivo.cortados`, no se guarda) | «ayudar al hada» | Solo quedan los tocones; hada de rodillas en el suelo (`Herida`) | `?dev=claroManos` |
       | `hadaLiberada: true` | «recibir el amuleto del hada» | Claro despierto; raíces abiertas; hada junto al atril con el amuleto (`Entregar`) | `?dev=hadaLibre` |
       | `bono2Completado: true` (+ `amuletoHada` en `collectedItems`, `vidasExtra` +1) | «hablar con el hada» | Hada volando sobre el claro (`Volar`) | `?dev=bono2` |

       Escenas en curso (solo en memoria, `useClaroStore`; mientras duran, la cámara es fija, el avatar lo mueve la escena y salir o abrir un diálogo las cancela sin guardar):
       - `rescate` (`rescate.ts`, `RescateEscena`, `RescateHud`): `camino` (rodea el pedestal hasta el nudo) → `acecho` (el pulso de savia baja; `rescateVivo.falta` segundos para que llegue) → `tajo` → `seca` (acierto: el tallo se recoge hacia el nudo) o `aprieta` (fallo) → al tercer tallo, `fin` y empieza el auxilio.
       - `auxilio` (`auxilio.ts`, `ClaroEscena`, `ClaroHud`): `cae` (revolotea y cae al suelo) → `camino` → `arrodilla` (clip `Arrodillarse`, mano tendida) → `sostiene` (mantener; `auxilioVivo.fuerza` de 0 a 1) → `lista` (soltar) → `despega` (guarda `hadaLiberada`) → `despierta` (anillo de luz `sleepingGlow`, `auxilioVivo.onda` de 0 a 1).
       - `entrega` (`entrega.ts`, `ClaroEscena`, `ClaroHud`): `camino` → `arrodilla` → `acerca` (ella trae el amuleto) → `cuelga` (del hada al pecho del avatar) → `celebra` (el avatar se pone de pie; ella gira) → `guarda` → guarda `bono2Completado`, la estrella extra y el amuleto, y abre el pergamino final.
   - **Desafío 3 — Pueblo de Hedrig, Túneles de la Cumbre, Espectro Simona y Ogro:**
     - `http://localhost:5174/mundo?dev=llegadaPueblo` — Saliendo del sendero del bosque al pueblo minero (`x: 78, y: 24.5, z: -205`, `llegoAlPueblo: false`) para disparar en vivo el aviso de llegada.
     - `http://localhost:5174/mundo?dev=desafio3` (alias: `http://localhost:5174/mundo?dev=pueblo`) — Frente a la casa de Hedrig (`x: 82, y: 25.3, z: -211.6`) tras superar el Desafío 2.
     - `http://localhost:5174/mundo?dev=hedrigCasa` — Ayuda de Hedrig aceptada y puerta abierta para entrar a recoger **guante de minero, brújula y muñeca Simona**.
     - `http://localhost:5174/mundo?dev=tuneles` — Boca de la mina hacia los túneles (`x: 97, y: 25.4, z: -196`) con **guante, brújula y muñeca** en la mochila. Las galerías están cerradas por muros en todo el borde del suelo (`npm run tuneles:fisica`): sirve para recorrerlas pegado a las paredes.
     - `http://localhost:5174/mundo?dev=espectro` — Cámara del Espectro Simona en los túneles (`x: 126, y: 30.5, z: -178.5`) con la muñeca (`3`) lista para calmarla: al usarla, el avatar **gira solo hasta quedar de frente a la niña fantasma** y le ofrece la muñeca (esté mirando hacia donde esté), y ella se transforma en `NinaClara`.
     - `http://localhost:5174/mundo?dev=espectroSinMuneca` — Cámara del Espectro **sin la muñeca**, para probar la persecución, daño por frío/escarcha y el mensaje al intentar calmarla sin muñeca.
     - `http://localhost:5174/mundo?dev=puente` — Antes del puente de madera sobre la grieta (`x: 138, y: 35.8, z: -165`), espectro ya calmado. El puente es **una sola rampa lisa con una baranda a cada lado** (generadas desde el modelo `TunelPuente`): se cruza por todo el ancho del tablero sin tropezar en las ranuras.
     - `http://localhost:5174/mundo?dev=ogro` — Sala del Ogro y mesa de pulso (`x: 111.5, y: 44, z: -166`), espectro calmado y **guante de minero (`1`)** en la mochila: presiona `E` junto a la mesa: el avatar se pone el guante, apoya el codo en la mesa y juega a las vencidas (cámara fija, cercana y alta); gana haciendo clic muchas veces. **Los brazos se inclinan según la barra:** si vas ganando, el brazo del ogro baja hacia su lado derecho; si él va ganando, el tuyo baja hacia tu lado derecho; con la barra llena o vacía quedan tumbados sobre la mesa.
     - `http://localhost:5174/mundo?dev=ogroSinGuante` — Sala del Ogro **sin el guante de minero**, para probar cómo el Ogro te golpea (20 PV por golpe, sin teletransporte ni aviso) al acercarte a la escalera, y cómo te gana las vencidas (te dobla el brazo hacia tu derecha y pierdes una estrella) si lo retas sin guante.
     - `http://localhost:5174/mundo?dev=ogroVencido` — Ogro vencido en el pulso (`ogroVencido: true`), diálogo `desafio3.ogroVencido` abierto y escalera en espiral despejada.
     - `http://localhost:5174/mundo?dev=escaleraCumbre` — Últimos peldaños antes de salir a la Cumbre (`x: 106.75, y: 53.0, z: -164.7`, `mision3Completada: false`), para subir y disparar en vivo la llegada a la Cumbre.
   - **Relato de Cierre — Cumbre de la Desolación, Santuario, Dríada, Cáliz y Cinemática Final:**
     - `http://localhost:5174/mundo?dev=cumbre` (alias: `http://localhost:5174/mundo?dev=relatoCierre`) — Salida de los túneles en la Cumbre (`x: 107.7, y: 53.6, z: -161.85`), Desafío 3 completado.
     - `http://localhost:5174/mundo?dev=cumbreDialogo` — Salida de los túneles con el pergamino y narración de llegada a la Cumbre abierto (`desafio3.cumbre`).
     - `http://localhost:5174/mundo?dev=santuario` — Plaza frente a las puertas del Santuario (`x: 147, y: 53.4, z: -153`), donde la **Dríada** sale a recibirte.
     - `http://localhost:5174/mundo?dev=driadaDialogo` — Frente a la Dríada con su diálogo y narración abiertos (`relatoCierre.driada`).
     - `http://localhost:5174/mundo?dev=santuarioAbierto` — Frente al portón doble del Santuario ya desbloqueado por la Dríada (`x: 150.5, y: 53.5, z: -153`), listo para empujar las hojas y entrar.
     - `http://localhost:5174/mundo?dev=altar` (alias: `http://localhost:5174/mundo?dev=caliz`) — Dentro del Santuario frente al altar (`x: 161, y: 53.6, z: -153`): presiona `E` («tomar el cáliz») para disparar la **Cinemática Final** y terminar el juego.
     - `http://localhost:5174/mundo?dev=cinematica` — Reproduce directamente la **Cinemática Final narrada (6 tomas)** sobre el mapa verde recuperado y abre el resumen de victoria al terminar.
     - `http://localhost:5174/mundo?dev=victoria` — Abre el pergamino final **¡Fin del juego: recuperaste el cáliz!** con 3 estrellas y los 2 bonos completados (narración `04_narrador_09` + `10`).
     - `http://localhost:5174/mundo?dev=victoriaSinBonos` — Abre el pergamino final de victoria sin los bonos opcionales (narración alternativa `04_narrador_09` + `11`).
   - **Casos de Vidas (1, 2 y 3 estrellas), Bonos (+1 y +2 vidas extra) y Bajos Rendimientos Académicos:**
     - `http://localhost:5174/mundo?dev=vidas3` — **3 vidas (3 estrellas, 0 bonos)**.
     - `http://localhost:5174/mundo?dev=vidas2` — **2 vidas (2 estrellas tras 1.er bajo)**.
     - `http://localhost:5174/mundo?dev=vidas1` — **1 vida (1 estrella tras 2.º bajo)**.
     - `http://localhost:5174/mundo?dev=vidas3bono1` — **3 vidas + 1 bono** (3 estrellas + 1 estrella extra del Anillo de oro).
     - `http://localhost:5174/mundo?dev=vidas3bonos2` — **3 vidas + 2 bonos** (3 estrellas + 2 estrellas extra: Anillo de oro y Amuleto del hada).
     - `http://localhost:5174/mundo?dev=bajo1` — Diálogo y narración del **1.er Bajo Rendimiento Académico** (`bajo.1`, quedan 2 estrellas).
     - `http://localhost:5174/mundo?dev=bajo2` — Diálogo y narración del **2.º Bajo Rendimiento Académico** (`bajo.2`, queda 1 estrella y reinicia la historia en Villa de Boj).
     - `http://localhost:5174/mundo?dev=bajo3` — Diálogo y narración del **3.er Bajo Rendimiento Académico** (`bajo.3`, pierdes el personaje actual y al cerrar te lleva a elegir uno nuevo).
     - `http://localhost:5174/mundo?dev=bajoVidaExtra` — Diálogo y narración de **Perdiste una estrella extra** (`bajo.vidaExtra`, el bono te salva del bajo rendimiento).
   - **Pantallas de Onboarding, Selección de Personaje y Panel Administrativo:**
     - `http://localhost:5174/login?dev=registro` — Registro estudiantil y modal de Ley 1581 desde cero.
     - `http://localhost:5174/seleccion-personaje?dev=personaje` — Selección de género (`Hombre` / `Mujer`) y de los 12 avatares disponibles.
     - `http://localhost:5174/seleccion-personaje?dev=personajePerdido` — Selección de personaje con `Elfa` y `Guerrero` bloqueados tras haber caído en 3.er bajo.
     - `http://localhost:5174/admin?dev=admin` — Panel administrativo completo en memoria.
     - `http://localhost:5174/login?dev=admin` — Inicio de sesión único: como la cuenta es administradora (lista `VITE_ADMIN_EMAILS` o `role: 'admin'` en su perfil) redirige sola a `/admin`; cualquier otra cuenta sigue como estudiante (registro → personaje → mundo). Desde el panel, «Ver Mundo 3D» deja al administrador jugar como estudiante. `/admin` ya no tiene pantalla de inicio de sesión propia: sin sesión lleva a `/login`.
   - **Modificadores combinables en cualquier URL (`&vidas=`, `&bonos=`, `&vida=`, `&dialogo=`, `&mochila=`, `&avatar=`, `&perdidos=`, `&spawn=`):**
     - Puedes combinar cualquier preset base con:
       - `&vidas=1` · `&vidas=2` · `&vidas=3` (fija 1, 2 o 3 estrellas base; ej.: `http://localhost:5174/mundo?dev=bosque&vidas=1`).
       - `&bonos=0` · `&bonos=1` · `&bonos=hada` · `&bonos=2` (activa 0, 1 o los 2 bonos con sus estrellas extra e ítems en mochila; ej.: `http://localhost:5174/mundo?dev=tuneles&vidas=3&bonos=2`).
       - `&vida=15` (inicia con 15 PV de salud para probar morir rápido frente a un enemigo y ver el bajo o el consumo de estrella extra; ej.: `http://localhost:5174/mundo?dev=ogroSinGuante&vidas=1&vida=15`).
       - `&mochila=1` (abre la mochila al iniciar; ej.: `http://localhost:5174/mundo?dev=tuneles&bonos=2&mochila=1`).
       - `&dialogo=<id>` (abre cualquier diálogo al cargar) · `&cinematica=1` · `&avatar=Guerrero` · `&perdidos=Elfa,Gnomo` · `&spawn=x,y,z[,yaw]`.
   - **Identidades sandbox oficiales ya configuradas en `devSession.ts` y `adminService.ts` (úsalas tal cual en capturas y evidencias, sin sobrescribirlas con otros nombres):**
     - Estudiante de prueba (`?dev=registro`, `?dev=personaje`, `/mundo?dev=...`): **`Danna Guerrero Vargas`** (`danna.guerrero@correounivalle.edu.co`, código `202427615`, alias `Danna`, rol `student`).
     - Administrador (`/admin?dev=admin`): sesión activa de **`Fabian Stiven Valencia Cordoba`** (`fabian.cordoba@correounivalle.edu.co`, rol `admin`), listando en la tabla a **`Danna Guerrero Vargas`** (`ESTUDIANTE`, Misiones 1 y 2 completadas al 100 %) y a **`Fabian Stiven Valencia Cordoba`** (`ADMIN`).
3. **API de inspección en consola (`window.__DEV_GAME__`) y controles:**
   - Verifica `window.__DEV_GAME__.status().ready === true` antes de enviar entradas al `<canvas>`.
   - `window.__DEV_GAME__.status()` reporta `{ ready, warming, loadStage, loadPercent, rendererError, backend, region, interior, position, action, health, dialog, backpackOpen, progress }`.
   - Acciones rápidas en memoria: `window.__DEV_GAME__.teleport(x, y, z)`, `setProgress({...})`, `heal()`, `hurt()` (derrota al jugador: para probar bajos y estrellas extra), `openBackpack(true)`, `closeDialog()`.
   - **Medidor de rendimiento (solo en desarrollo):** al cargar el mundo aparece a la izquierda, bajo la barra de vida, un panel con FPS, milisegundos de CPU y de GPU por cuadro (`stats-gl` vía `<StatsGl>` de drei: mide WebGPU y WebGL 2; **no usar `r3f-perf`**, que lee el contexto WebGL y no funciona con el `WebGPURenderer`) y, debajo, motor, resolución (`dpr`), dibujos, triángulos, geometrías y texturas (`rendering/DevStats.tsx`). `&perf=0` lo oculta (p. ej. para capturas). No existe en el juego publicado.
   - **Minimapa:** abajo a la izquierda (`src/game/hud/Minimap.tsx`; con controles táctiles pasa bajo la barra de vida), con el mismo panel de pergamino del HUD, muestra de cerca (~85 m) lo que rodea al avatar: el mapa (`public/sprites-2d/minimapa.jpg`, render de `Map.blend`) se desliza bajo una flecha roja fija en el centro que gira hacia donde camina, con los lugares de la historia (`src/game/world/landmarks.ts`; los dos bonos no se marcan: son extras opcionales), el siguiente destino latiendo en dorado y, si queda fuera de la vista, un puntero dorado en el borde hacia él. Clic o tecla `M` abre el mapa completo sobre la pantalla, con leyenda y la posición del avatar (el nombre de cada lugar sale solo al pasar el mouse por su punto); se cierra con la ×, clic afuera, `M` o `Esc`. Se oculta durante narraciones, cinemáticas y con la mochila abierta. Si cambia el mapa en Blender hay que volver a renderizar la imagen con los mismos límites (`MAP_PICTURE`).
   - Controles en el canvas: `W A S D` / flechas (caminar), `Shift` (correr), `Space` (saltar), `E` (interactuar / recoger), `1`–`3` (ítems de mochila), `M` (abrir/cerrar el mapa).

---

## 5. Skill de Informes Contractuales (`informes-contrato`)

Cuando el usuario pida elaborar, actualizar o revisar el **Informe 4** (o cualquier cuota/informe mensual siguiente), reutilizar los documentos previos (`INFORME DE ACTIVIDADES Cuota N-1` e `Informe mensual al supervisor N-1`) o redactar el correo de entrega al **Equipo Proyecto MEN**, lee y sigue obligatoriamente **`.agents/skills/informes-contrato/SKILL.md`** (también disponible como `/informes-contrato` en `.claude/skills/informes-contrato/SKILL.md`), junto con su extractor/auditor `.agents/skills/informes-contrato/scripts/inspect_docx.py` y sus referencias en `.agents/skills/informes-contrato/references/`.

