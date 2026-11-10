# AGENTS.md — Brillo en la montaña

> **PRIORIDAD MÁXIMA — REGLA #1 (Obligatoria al iniciar y al finalizar cambios): Usar y actualizar `graphify`**
> 1. **Leer `graphify` primero (primera acción siempre):** Este proyecto cuenta con un grafo de conocimiento en `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`). Antes de ejecutar búsquedas (`grep`), explorar directorios o abrir archivos fuente para entender el proyecto, su arquitectura o relaciones entre módulos, **consulta primero el grafo**:
>    - `graphify query "<pregunta>"` — contexto general sobre módulos, flujos o componentes.
>    - `graphify path "<NodoA>" "<NodoB>"` — ruta más corta y conexión entre dos conceptos o archivos.
>    - `graphify explain "<nodo>"` — explicación puntual de un símbolo, módulo o entidad.
>    - Lee `graphify-out/GRAPH_REPORT.md` cuando necesites visión global de comunidades, *God Nodes* o arquitectura general, y lee solo los archivos/líneas concretos que el grafo indique.
>    - Incluye siempre esta regla en el prompt de cualquier subagente que explores sobre el código.
> 2. **Actualizar `graphify` tras cambios funcionales o estructurales:** Cada vez que agregues, modifiques o muevas funcionalidades, archivos, componentes, rutas, modelos o relaciones que hagan cambiar el árbol/grafo del proyecto, **debes actualizar el grafo antes de dar por terminada la tarea**:
>    - Para cambios en código (`.ts`, `.tsx`, `.js`, `.json`): ejecuta `graphify update .` (extracción AST incremental, sin costo de API).
>    - Si también cambian documentos (`.md`, `.html`), sprites/imágenes o relaciones semánticas: ejecuta `/graphify . --update` (o `/graphify .` si se requiere reconstrucción completa).

---

## REGLA #2 — Protección estricta de la Base de Datos Real en Pruebas

**NUNCA elimines, vacíes, trunques, reinicies ni sobrescribas destructivamente ningún dato de la base de datos real (Firebase Auth / Cloud Firestore configurada en `.env`) durante pruebas, depuración, scripts o verificaciones sin confirmación explícita previa del usuario.**

Reglas específicas de obligado cumplimiento:
- La base de datos real almacena registros estudiantiles, consentimientos de Ley 1581, roles (`admin` / `student`), avatares y progreso académico/juego en la colección `users/{uid}` de Cloud Firestore (`src/services/firebase.ts`, `userService.ts`, `progressService.ts`, `adminService.ts`).
- **Prohibido sin permiso explícito del usuario:**
  - Ejecutar `deleteDoc`, borrados por lotes (`writeBatch` / scripts de limpieza), eliminación de cuentas de Firebase Auth o `setDoc` sin `{ merge: true }` sobre documentos reales.
  - Invocar operaciones que borren campos o reinicien progreso real en pruebas manuales o automatizadas (p. ej. `clearCharacter`, `deleteField()`, o forzar un *segundo bajo* / *tercer bajo* sobre la cuenta real de un usuario o estudiante).
- **Cómo probar de forma segura:**
  - En el navegador (Google Chrome), **entra siempre usando el modo sandbox `?dev=<preset>`** (ver sección de Pruebas en Navegador abajo), el cual usa `DEV_USER_UID = 'dev-local-tester'` y cortocircuita por completo Firebase Auth y Cloud Firestore.
  - Valida reglas de negocio y misiones sobre las funciones puras (`mission.ts`, `progression.ts`) y stores locales de Zustand (`useProgressStore`, `useAuthStore`) sin llamar a Firestore.
  - En pruebas automatizadas o de integración, usa *mocks/stubs* de `src/services/*` o el **Firebase Local Emulator Suite**, nunca el proyecto real de `.env`.
  - Si una prueba requiere ineludiblemente borrar o restablecer un registro en Firestore real, **detente, explica exactamente qué documento/campo se afectaría y espera confirmación explícita del usuario**.

---

## Pruebas en Navegador (Google Chrome + WebGPU + Modo Sandbox `?dev=...`)

El juego exige **Google Chrome real con aceleración WebGPU** sobre contexto seguro (`http://localhost:5174` con `npm run dev` o `npm run docker:dev`). En desarrollo (`import.meta.env.DEV`) existe `src/app/devSession.ts`, que se elimina al 100 % en *builds* de producción:

1. **Cómo abrir Chrome desde el agente:**
   - Usa las herramientas de **Chrome DevTools MCP** (plugin `chrome-devtools`) o `/browser` sobre Google Chrome local (no navegadores sin WebGPU).
   - Navega siempre con `?dev=<preset>` para omitir Google OAuth (`@correounivalle.edu.co`) y proteger Firestore real (`isDevUser` en `authStore.ts` desactiva lecturas/escrituras en `progressService.ts`, `userService.ts` y `adminService.ts`).
2. **URLs y presets disponibles (`http://localhost:5174`):**
   - `/mundo?dev=1` (alias: `villa`, `desafio1`) — Puerta de Villa de Boj desde cero (`x: -39, y: 12.4, z: 18`).
   - `/mundo?dev=imeri` — Frente a la casa de Imeri (`x: 14.5, y: 11.8, z: 41`), puerta abierta y mochila activa.
   - `/mundo?dev=pantano` — Orilla seca antes del Pantano (`x: 50, y: 12.2, z: 24`) con gema, soga e insecticida listos.
   - `/mundo?dev=desafio2` (alias: `elfo`) — Pie del árbol del Elfo (`x: -36.4, y: 11.9, z: -122.5`) tras superar el Desafío 1.
   - `/mundo?dev=bosque` — Entrada del Bosque de la Oscuridad (`x: -25, y: 13.3, z: -182`) con espada, lente y mapa en mochila.
   - `/mundo?dev=desafio3` (alias: `pueblo`) — Frente a la casa de Hedrig (`x: 82, y: 25.3, z: -211.6`) tras superar el Desafío 2.
   - `/mundo?dev=tuneles` — Boca de la mina hacia los túneles (`x: 97, y: 25.4, z: -196`) con guante, brújula y muñeca en mochila (ayuda de Hedrig aceptada).
   - `/mundo?dev=ogro` — Sala del Ogro al final del laberinto (`x: 111.5, y: 44, z: -166`), espectro ya calmado.
   - `/mundo?dev=cumbre` (alias: `relatoCierre`) — Salida de los túneles en la Cumbre (`x: 107.7, y: 53.6, z: -161.85`), Desafío 3 completado.
   - `/mundo?dev=santuario` — Plaza frente a las puertas del Santuario, junto a la Dríada (`x: 147, y: 53.4, z: -153`).
   - `/mundo?dev=choza` (Bono 1) — Junto a la choza de la estatua, a la salida del pantano (`x: -62, y: 9.9, z: -87.5`).
   - `/mundo?dev=claro` (Bono 2) — Borde del Claro del Hada en el bosque (`x: 40, y: 16, z: -221.5`), con la espada élfica.
   - `/seleccion-personaje?dev=personaje` · `/login?dev=registro` · `/admin?dev=admin` — Pantallas de onboarding y panel administrativo 100 % en memoria.
   - **Identidades sandbox preconfiguradas (no cambiar por otros nombres ficticios en capturas):**
     - Estudiante por defecto (`?dev=1`, `?dev=registro`, `?dev=personaje`, etc.): **`Danna Guerrero Vargas`** (`danna.guerrero@correounivalle.edu.co`, código `202427615`, alias `Danna`, rol `student`).
     - Administrador (`/admin?dev=admin`): sesión iniciada como **`Fabian Stiven Valencia Cordoba`** (`fabian.cordoba@correounivalle.edu.co`, rol `admin`), mostrando en el listado de usuarios a la estudiante **`Danna Guerrero Vargas`** (`ESTUDIANTE`, Misiones 1 y 2 al 100 %) y al administrador **`Fabian Stiven Valencia Cordoba`** (`ADMIN`).
   - Parámetros extra opcionales: `&spawn=x,y,z[,yaw]` (coordenadas exactas) y `&avatar=Elfa`.
3. **Inspector en vivo (`window.__DEV_GAME__`) y controles:**
   - Espera a que `window.__DEV_GAME__.status().ready === true` antes de interactuar con el mundo 3D.
   - `window.__DEV_GAME__.status()` devuelve `{ ready, warming, loadStage, loadPercent, rendererError, region, interior, position, action, health, dialog, backpackOpen, progress }`.
   - Helpers en memoria: `window.__DEV_GAME__.teleport(x, y, z)`, `setProgress({...})`, `heal()`, `hurt()` (derrota al jugador: para probar bajos y estrellas extra), `openBackpack(true)`, `closeDialog()`.
   - Teclado en el canvas: `W A S D` / flechas (mover), `Shift` (correr), `Space` (saltar), `E` (interactuar / recoger), `1`–`3` (usar ítems rápidos de la mochila).

---

## Comandos del proyecto

```bash
npm run dev           # Servidor de desarrollo (Vite)
npm run build         # Verificación TypeScript estricta (tsc -b) + build de producción
npm run lint          # Linter rápido con oxlint
npm run preview       # Vista previa del build en dist/
npm run docker:dev    # Levantar contenedor de desarrollo (puerto 5174, alterna desde prod)
npm run docker:prod   # Levantar contenedor de producción con Nginx (puerto 8081, alterna desde dev)
```

---

## Arquitectura y convenciones clave

Monolito 3D en capas con flujo unidireccional estricto (el navegador requiere **WebGPU**, sin fallback a WebGL):

```text
pages ──► game (challenges ──► player / world ──► engine) ──► store / services ──► data
```

- **Aislamiento de Firebase (`src/services/`):** Ningún componente React ni módulo de `game/` importa `firebase/*` directamente; toda lectura/escritura pasa por `src/services/`.
- **Desafíos autocontenidos (`src/game/challenges/`):** Cada desafío (`desafio1`, `desafio2`, `desafio3`, `relatoCierre`) encapsula sus `assets.ts`, `visibility.ts`, `mission.ts` (funciones puras compartidas con `adminService.ts`), `items.ts`, `backpack.ts`, mundo 3D y diálogos, y se registra únicamente en `src/game/challenges/registry.ts`.
- **Rendimiento 3D y colisiones:**
  - Modelos exportados desde `Map.blend` en `public/models-3d/map/` en coordenadas de mundo (`glTF (x, y, z) = Blender (x, z, -y)`).
  - Colisiones únicamente con cuboides (`CuboidColliders`), salvo `Terreno` (trimesh) y `LimiteMapa`.
  - Visibilidad por región (`visibility.ts`), geometría repetida con `InstancedField`, mallas estáticas fusionadas (`merge`), selectores en stores de Zustand para no re-renderizar en movimiento, y cero `backdrop-blur` sobre el `<Canvas>`.

---

## Skills del Proyecto (`.agents/skills/`)

- **`informes-contrato`** (`.agents/skills/informes-contrato/SKILL.md`): Usa esta skill siempre que el usuario pida crear, actualizar o auditar los informes contractuales mensuales para DEXIA / Proyecto MEN (**`INFORME DE ACTIVIDADES Cuota N`** e **`Informe mensual al supervisor N`** con evidencias APA y capturas WebGPU), extraer contenido/imágenes/firma de los informes previos (`.docx` / `.pdf`) o redactar el correo de entrega.

