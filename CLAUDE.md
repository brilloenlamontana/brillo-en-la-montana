# CLAUDE.md — Brillo en la montaña

## 1. PRIMERA INSTRUCCIÓN OBLIGATORIA: `graphify` (Leer primero y mantener actualizado)

Este proyecto tiene un grafo de conocimiento persistente en `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`) con *god nodes*, detección de comunidades y relaciones entre archivos.

Cuando el usuario escriba `/graphify`, usa la skill `graphify` instalada antes de hacer cualquier otra cosa.

### Reglas de lectura y actualización del grafo:
1. **Leer `graphify` como primer paso siempre:** Cuando exista `graphify-out/graph.json`, ejecuta `graphify query "<pregunta>"` **antes** de tu primer `Grep`, `Glob`, búsqueda o lectura de archivos fuente ante cualquier consulta o tarea sobre el código, arquitectura o relaciones, e incluye esta misma regla en el prompt de todo subagente que explore el repositorio:
   - `graphify query "<pregunta>"` — contexto relevante acotado del grafo.
   - `graphify path "<A>" "<B>"` — relación y camino entre dos módulos, símbolos o conceptos.
   - `graphify explain "<concepto>"` — detalle puntual de un nodo.
   - Si existe `graphify-out/wiki/index.md`, úsalo para navegación amplia antes de recorrer carpetas manualmente.
   - Lee `graphify-out/GRAPH_REPORT.md` únicamente para revisiones globales de arquitectura o cuando `query`/`path`/`explain` no basten, y abre archivos crudos solo en las rutas/líneas ubicadas por el grafo.
   - Archivos modificados en `graphify-out/` tras hooks o actualizaciones incrementales son normales; nunca omitas `graphify` salvo que el usuario lo pida explícitamente.
2. **Actualizar el árbol/grafo de `graphify` ante cambios funcionales:** Cada vez que implementes o actualices funcionalidades, agregues/renombres/elimines archivos, cambies contratos, componentes o relaciones de modo que el árbol de `graphify` deba cambiar, **actualízalo obligatoriamente antes de cerrar la tarea**:
   - Cambios en código fuente: ejecuta `graphify update .` (solo AST, incremental y sin costo de API).
   - Cambios que también incluyan documentación (`.md`, `.html`), imágenes/sprites o arquitectura semántica: ejecuta `/graphify . --update` (o `/graphify .` para reconstrucción completa).
   - Un diff grande en `graphify-out/graph.json` (si llegara a versionarse) es esperado al regenerar el grafo; no omitas su actualización.

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
npm run docker:dev    # Contenedor Docker dev en http://localhost:5174 (alterna desde prod)
npm run docker:prod   # Contenedor Docker prod (Nginx) en http://localhost:8081 (alterna desde dev)
```

- **Capas unidireccionales:** `pages ──► game (challenges ──► player / world ──► engine) ──► store / services ──► data`.
- **WebGPU obligatorio:** Renderizado con `three` + `@react-three/fiber` sobre WebGPU (sin fallback a WebGL).
- **Firebase encapsulado:** Solo `src/services/` interactúa con Firebase; ningún componente o módulo del motor importa `firebase/*`.
- **Desafíos modulares:** Cada carpeta en `src/game/challenges/` (`desafio1`, `desafio2`, `desafio3`, `relatoCierre`) implementa el contrato `Challenge` (`types.ts`) y se conecta en `registry.ts`.
- **Física y rendimiento:** Colisiones por cuboides (`CuboidColliders`, salvo `Terreno` y `LimiteMapa`), visibilidad por región (`visibility.ts`), `InstancedField` para objetos repetidos, mallas estáticas fusionadas (`merge`), selectores en Zustand y sin `backdrop-blur` sobre el canvas.

---

## 4. Ingreso al Mundo 3D para Pruebas en Google Chrome (`?dev=<preset>`)

El motor requiere **Google Chrome real con soporte WebGPU** sobre `http://localhost:5174` (`npm run dev` o `npm run docker:dev`). En modo desarrollo (`import.meta.env.DEV`, eliminado por Vite en producción) existe `src/app/devSession.ts` para entrar al juego sin Google OAuth (`@correounivalle.edu.co`) y **sin leer ni escribir jamás en Cloud Firestore real**:

1. **Cómo conectar Google Chrome desde Claude / automatización:**
   - Usa **Chrome DevTools MCP** conectado a Google Chrome local, o lanza Chrome real con soporte GPU (`channel: 'chrome'` en Playwright/Puppeteer, evitando Chromium headless sin adaptador WebGPU).
   - Abre siempre las rutas con `?dev=<preset>`: `useAuthSession.ts` omite `onAuthStateChanged` y `isDevUser` (`authStore.ts`) bloquea toda lectura/escritura a Firestore en `progressService.ts`, `userService.ts` y `adminService.ts`.
2. **Presets de entrada (`http://localhost:5174`):**
   - `/mundo?dev=1` (`villa` / `desafio1`) — Inicio en la puerta de Villa de Boj (`x: -39, y: 12.4, z: 18`).
   - `/mundo?dev=imeri` — Frente a la casa de Imeri (`x: 14.5, y: 11.8, z: 41`), puerta desbloqueada y mochila activa.
   - `/mundo?dev=pantano` — Entrada seca al Pantano de la Tristeza (`x: 50, y: 12.2, z: 24`) con gema, soga e insecticida.
   - `/mundo?dev=desafio2` (`elfo`) — Pie del árbol del Elfo (`x: -36.4, y: 11.9, z: -122.5`) con Desafío 1 completado.
   - `/mundo?dev=bosque` — Entrada del Bosque de la Oscuridad (`x: -25, y: 13.3, z: -182`) con espada, lente y mapa.
   - `/mundo?dev=desafio3` (`pueblo`) — Frente a la casa de Hedrig en el pueblo minero (`x: 82, y: 25.3, z: -211.6`).
   - `/mundo?dev=tuneles` — Boca de la mina hacia los túneles (`x: 97, y: 25.4, z: -196`) con guante, brújula y muñeca (ayuda de Hedrig aceptada).
   - `/mundo?dev=ogro` — Sala del Ogro al final del laberinto (`x: 111.5, y: 44, z: -166`), espectro ya calmado.
   - `/mundo?dev=cumbre` (`relatoCierre`) — Salida de los túneles en la Cumbre (`x: 107.7, y: 53.6, z: -161.85`), Desafío 3 completado.
   - `/mundo?dev=santuario` — Plaza frente a las puertas del Santuario, junto a la Dríada (`x: 147, y: 53.4, z: -153`).
   - `/mundo?dev=choza` (Bono 1) — Junto a la choza de la estatua, a la salida del pantano (`x: -62, y: 9.9, z: -87.5`).
   - `/mundo?dev=claro` (Bono 2) — Borde del Claro del Hada en el bosque (`x: 40, y: 16, z: -221.5`), con la espada élfica.
   - `/seleccion-personaje?dev=personaje` · `/login?dev=registro` · `/admin?dev=admin` — Flujos de registro, avatar y panel admin en memoria.
   - **Identidades sandbox oficiales ya configuradas en `devSession.ts` y `adminService.ts` (úsalas tal cual en capturas y evidencias, sin sobrescribirlas con otros nombres):**
     - Estudiante de prueba (`?dev=registro`, `?dev=personaje`, `/mundo?dev=...`): **`Danna Guerrero Vargas`** (`danna.guerrero@correounivalle.edu.co`, código `202427615`, alias `Danna`, rol `student`).
     - Administrador (`/admin?dev=admin`): sesión activa de **`Fabian Stiven Valencia Cordoba`** (`fabian.cordoba@correounivalle.edu.co`, rol `admin`), listando en la tabla a **`Danna Guerrero Vargas`** (`ESTUDIANTE`, Misiones 1 y 2 completadas al 100 %) y a **`Fabian Stiven Valencia Cordoba`** (`ADMIN`).
   - Parámetros opcionales: `&spawn=x,y,z[,yaw]` y `&avatar=Elfa`.
3. **API de inspección en consola (`window.__DEV_GAME__`) y controles:**
   - Verifica `window.__DEV_GAME__.status().ready === true` antes de enviar entradas al `<canvas>`.
   - `window.__DEV_GAME__.status()` reporta `{ ready, warming, loadStage, loadPercent, rendererError, region, interior, position, action, health, dialog, backpackOpen, progress }`.
   - Acciones rápidas en memoria: `window.__DEV_GAME__.teleport(x, y, z)`, `setProgress({...})`, `heal()`, `openBackpack(true)`, `closeDialog()`.
   - Controles en el canvas: `W A S D` / flechas (caminar), `Shift` (correr), `Space` (saltar), `E` (interactuar / recoger), `1`–`3` (ítems de mochila).

---

## 5. Skill de Informes Contractuales (`informes-contrato`)

Cuando el usuario pida elaborar, actualizar o revisar el **Informe 4** (o cualquier cuota/informe mensual siguiente), reutilizar los documentos previos (`INFORME DE ACTIVIDADES Cuota N-1` e `Informe mensual al supervisor N-1`) o redactar el correo de entrega al **Equipo Proyecto MEN**, lee y sigue obligatoriamente **`.agents/skills/informes-contrato/SKILL.md`** (también disponible como `/informes-contrato` en `.claude/skills/informes-contrato/SKILL.md`), junto con su extractor/auditor `.agents/skills/informes-contrato/scripts/inspect_docx.py` y sus referencias en `.agents/skills/informes-contrato/references/`.

