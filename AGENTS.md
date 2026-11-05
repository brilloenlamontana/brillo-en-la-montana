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
  - Valida reglas de negocio y misiones sobre las funciones puras (`mission.ts`, `progression.ts`) y stores locales de Zustand (`useProgressStore`, `useAuthStore`) sin llamar a Firestore.
  - En pruebas automatizadas o de integración, usa *mocks/stubs* de `src/services/*` o el **Firebase Local Emulator Suite**, nunca el proyecto real de `.env`.
  - Si una prueba requiere ineludiblemente borrar o restablecer un registro en Firestore real, **detente, explica exactamente qué documento/campo se afectaría y espera confirmación explícita del usuario**.

---

## Comandos del proyecto

```bash
npm run dev       # Servidor de desarrollo (Vite)
npm run build     # Verificación TypeScript estricta (tsc -b) + build de producción
npm run lint      # Linter rápido con oxlint
npm run preview   # Vista previa del build en dist/
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

