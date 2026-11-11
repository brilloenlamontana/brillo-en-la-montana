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
2. **URLs completas y casos de prueba disponibles (`http://localhost:5174`):**
   - **Desafío 1 — Villa de Boj, Casa de Imeri y Pantano de la Tristeza:**
     - `http://localhost:5174/mundo?dev=1` (alias: `http://localhost:5174/mundo?dev=villa`, `http://localhost:5174/mundo?dev=desafio1`) — Puerta de Villa de Boj desde cero (`x: -39, y: 12.4, z: 18`).
     - `http://localhost:5174/mundo?dev=carta` — Puerta de Villa de Boj con el pergamino y narración del anuncio del alcalde abierto (`desafio1.cartaAlcalde`).
     - `http://localhost:5174/mundo?dev=aldeano` — Plaza de Villa de Boj frente al aldeano (`x: -68.5, y: 12.2, z: 15.5`, carta leída).
     - `http://localhost:5174/mundo?dev=aldeana` — En la villa frente a la aldeana (`x: -83, y: 12.2, z: 33`, carta leída).
     - `http://localhost:5174/mundo?dev=imeriHablar` — Frente a la casa de Imeri con ayuda del aldeano aceptada, listo para hablar con Imeri.
     - `http://localhost:5174/mundo?dev=imeri` — Frente a la casa de Imeri (`x: 14.5, y: 11.8, z: 41`), puerta desbloqueada y mochila activa para entrar a recoger los 7 objetos.
     - `http://localhost:5174/mundo?dev=pantano` — Orilla seca antes del Pantano (`x: 50, y: 12.2, z: 24`) con **gema, soga e insecticida (5 pociones)** listos en la mochila.
     - `http://localhost:5174/mundo?dev=pantanoCasi` — Pantano con Golem apagado y `9/10` zumbadores derrotados: derrota al último zumbador para disparar la victoria del Desafío 1 en vivo.
     - `http://localhost:5174/mundo?dev=pantanoSuperado` — Pergamino y narración de **Pantano de la Tristeza superado** abiertos (`desafio1.pantanoSuperado`).
   - **Bono 1 — La Estatua de la Choza (salida del pantano):**
     - `http://localhost:5174/mundo?dev=choza` — Etapa 1: junto a la choza de la estatua cubierta de moho (`x: -62, y: 9.9, z: -87.5`).
     - `http://localhost:5174/mundo?dev=chozaLimpia` — Etapa 2: rostro de la estatua ya limpio (`estatuaLimpia: true`), diálogo abierto listo para encender el fuego.
     - `http://localhost:5174/mundo?dev=chozaEncendida` — Etapa 3: fuego encendido en el plato (`estatuaEncendida: true`), listo para recibir el **Anillo de oro** y la **1.ª estrella extra**.
     - `http://localhost:5174/mundo?dev=bono1` — Bono 1 completado (`anilloOro` en mochila + `1 estrella extra`).
   - **Desafío 2 — Casa del Elfo y Bosque de la Oscuridad:**
     - `http://localhost:5174/mundo?dev=desafio2` (alias: `http://localhost:5174/mundo?dev=elfo`) — Pie del árbol gigante frente al Elfo (`x: -36.4, y: 11.9, z: -122.5`) tras superar el Desafío 1.
     - `http://localhost:5174/mundo?dev=elfoCasa` — Ayuda del Elfo aceptada y puerta de su casa abierta en la copa del árbol para subir a recoger espada, lente y mapa.
     - `http://localhost:5174/mundo?dev=bosque` — Entrada del Bosque de la Oscuridad (`x: -25, y: 13.3, z: -182`) con **espada élfica, lente revelador y mapa del bosque** en la mochila.
     - `http://localhost:5174/mundo?dev=bosqueFrutas` — Bosque con los 6 duendes derrotados y `2/3` frutas buenas comidas: usa el lente (`2`) y come 1 fruta amarilla más.
     - `http://localhost:5174/mundo?dev=bosqueMuro` — Frente al muro oculto de roca (`x: 11, y: 15.2, z: -193`) con duendes derrotados y hambre saciada: presiona `3` (mapa) para bajar el muro, activar el sendero dorado y completar el Desafío 2.
     - `http://localhost:5174/mundo?dev=bosqueSuperado` — Pergamino y narración de **Bosque de la Oscuridad superado** abiertos (`desafio2.bosqueSuperado`).
   - **Bono 2 — El Claro del Hada (salida del bosque):**
     - `http://localhost:5174/mundo?dev=claro` — Etapa 1: borde del Claro del Hada (`x: 40, y: 16, z: -221.5`) con la espada élfica lista para cortar la trampa de zarzas.
     - `http://localhost:5174/mundo?dev=claroSinEspada` — Claro del Hada **sin la espada élfica**, para probar el aviso cuando intentas cortar las zarzas sin espada.
     - `http://localhost:5174/mundo?dev=hadaLibre` — Etapa 2: zarzas cortadas (`hadaLiberada: true`), diálogo del hada abierto y **Amuleto del hada** listo para recoger en el atril de raíces.
     - `http://localhost:5174/mundo?dev=bono2` — Bono 2 completado (`amuletoHada` en mochila, diálogo `desafio2.hadaAmuleto` abierto + `1 estrella extra`).
   - **Desafío 3 — Pueblo de Hedrig, Túneles de la Cumbre, Espectro Simona y Ogro:**
     - `http://localhost:5174/mundo?dev=llegadaPueblo` — Saliendo del sendero del bosque al pueblo minero (`x: 78, y: 24.5, z: -205`, `llegoAlPueblo: false`) para disparar en vivo el aviso de llegada.
     - `http://localhost:5174/mundo?dev=desafio3` (alias: `http://localhost:5174/mundo?dev=pueblo`) — Frente a la casa de Hedrig (`x: 82, y: 25.3, z: -211.6`) tras superar el Desafío 2.
     - `http://localhost:5174/mundo?dev=hedrigCasa` — Ayuda de Hedrig aceptada y puerta abierta para entrar a recoger **guante de minero, brújula y muñeca Simona**.
     - `http://localhost:5174/mundo?dev=tuneles` — Boca de la mina hacia los túneles (`x: 97, y: 25.4, z: -196`) con **guante, brújula y muñeca** en la mochila.
     - `http://localhost:5174/mundo?dev=espectro` — Cámara del Espectro Simona en los túneles (`x: 126, y: 30.5, z: -178.5`) con la muñeca (`3`) lista para calmarla y ver su transformación en `NinaClara`.
     - `http://localhost:5174/mundo?dev=espectroSinMuneca` — Cámara del Espectro **sin la muñeca**, para probar la persecución, daño por frío/escarcha y el mensaje al intentar calmarla sin muñeca.
     - `http://localhost:5174/mundo?dev=puente` — Antes del puente de madera sobre la grieta (`x: 138, y: 35.8, z: -165`), espectro ya calmado.
     - `http://localhost:5174/mundo?dev=ogro` — Sala del Ogro y mesa de pulso (`x: 111.5, y: 44, z: -166`), espectro calmado y **guante de minero (`1`)** listo para ganarle el pulso.
     - `http://localhost:5174/mundo?dev=ogroSinGuante` — Sala del Ogro **sin el guante de minero**, para probar cómo el Ogro te repele y quita 20 PV al intentar pasar o retarlo sin guante.
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
   - `window.__DEV_GAME__.status()` reporta `{ ready, warming, loadStage, loadPercent, rendererError, region, interior, position, action, health, dialog, backpackOpen, progress }`.
   - Acciones rápidas en memoria: `window.__DEV_GAME__.teleport(x, y, z)`, `setProgress({...})`, `heal()`, `hurt()` (derrota al jugador: para probar bajos y estrellas extra), `openBackpack(true)`, `closeDialog()`.
   - Controles en el canvas: `W A S D` / flechas (caminar), `Shift` (correr), `Space` (saltar), `E` (interactuar / recoger), `1`–`3` (ítems de mochila).

---

## 5. Skill de Informes Contractuales (`informes-contrato`)

Cuando el usuario pida elaborar, actualizar o revisar el **Informe 4** (o cualquier cuota/informe mensual siguiente), reutilizar los documentos previos (`INFORME DE ACTIVIDADES Cuota N-1` e `Informe mensual al supervisor N-1`) o redactar el correo de entrega al **Equipo Proyecto MEN**, lee y sigue obligatoriamente **`.agents/skills/informes-contrato/SKILL.md`** (también disponible como `/informes-contrato` en `.claude/skills/informes-contrato/SKILL.md`), junto con su extractor/auditor `.agents/skills/informes-contrato/scripts/inspect_docx.py` y sus referencias en `.agents/skills/informes-contrato/references/`.

