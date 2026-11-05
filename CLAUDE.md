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
  - Prueba la lógica sobre funciones puras (`mission.ts`, `progression.ts`) y estado en memoria de Zustand (`useProgressStore`, `useAuthStore`).
  - Usa *mocks/stubs* de `src/services/*` o **Firebase Local Emulator Suite** para pruebas automatizadas; jamás apuntes scripts destructivos al proyecto real definido en `.env`.

---

## 3. Comandos y Arquitectura Rápida

```bash
npm run dev       # Servidor de desarrollo Vite
npm run build     # tsc -b (TypeScript estricto) + vite build
npm run lint      # oxlint
```

- **Capas unidireccionales:** `pages ──► game (challenges ──► player / world ──► engine) ──► store / services ──► data`.
- **WebGPU obligatorio:** Renderizado con `three` + `@react-three/fiber` sobre WebGPU (sin fallback a WebGL).
- **Firebase encapsulado:** Solo `src/services/` interactúa con Firebase; ningún componente o módulo del motor importa `firebase/*`.
- **Desafíos modulares:** Cada carpeta en `src/game/challenges/` (`desafio1`, `desafio2`, `desafio3`, `relatoCierre`) implementa el contrato `Challenge` (`types.ts`) y se conecta en `registry.ts`.
- **Física y rendimiento:** Colisiones por cuboides (`CuboidColliders`, salvo `Terreno` y `LimiteMapa`), visibilidad por región (`visibility.ts`), `InstancedField` para objetos repetidos, mallas estáticas fusionadas (`merge`), selectores en Zustand y sin `backdrop-blur` sobre el canvas.

