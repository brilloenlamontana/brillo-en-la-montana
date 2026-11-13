# AGENTS.md — Brillo en la montaña

> **PRIORIDAD MÁXIMA — REGLA #1: Consultar `graphify` al iniciar, pero actualizarlo SOLO cuando el usuario lo pida**
> 1. **Leer `graphify` primero (primera acción siempre):** Este proyecto cuenta con un grafo de conocimiento en `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`). Antes de ejecutar búsquedas (`grep`), explorar directorios o abrir archivos fuente para entender el proyecto, su arquitectura o relaciones entre módulos, **consulta primero el grafo**:
>    - `graphify query "<pregunta>"` — contexto general sobre módulos, flujos o componentes.
>    - `graphify path "<NodoA>" "<NodoB>"` — ruta más corta y conexión entre dos conceptos o archivos.
>    - `graphify explain "<nodo>"` — explicación puntual de un símbolo, módulo o entidad.
>    - Lee `graphify-out/GRAPH_REPORT.md` cuando necesites visión global de comunidades, *God Nodes* o arquitectura general, y lee solo los archivos/líneas concretos que el grafo indique.
>    - Incluye siempre esta regla en el prompt de cualquier subagente que explores sobre el código.
> 2. **NO actualizar `graphify` automáticamente (solo bajo petición explícita del usuario):** **PROHIBIDO ejecutar `graphify update .` o `/graphify` por cuenta propia tras cada cambio o ciclo de prueba y error**, ya que consume demasiados tokens y tiempo. **Solo el usuario decide cuándo actualizar `graphify`**; ejecútalo única y exclusivamente cuando el usuario lo solicite de forma explícita:
>    - Cuando el usuario lo pida para cambios en código (`.ts`, `.tsx`, `.js`, `.json`): ejecuta `graphify update .` (extracción AST incremental, sin costo de API).
>    - Cuando el usuario lo pida incluyendo documentos (`.md`, `.html`), sprites/imágenes o relaciones semánticas: ejecuta `/graphify . --update` (o `/graphify .` si pide reconstrucción completa).

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

## Verificación de Cambios (`lint`) y Pruebas en Navegador (`?dev=...`)

> **REGLA DE FLUJO DE TRABAJO — PROHIBIDO PROBAR EN CHROME POR CUENTA PROPIA:**
> - **NO abras ni pruebes en Google Chrome automáticamente** tras hacer cambios (ni con Chrome DevTools MCP, ni con `/browser`, ni con Playwright/Puppeteer). **Las pruebas en Chrome las hace exclusivamente el usuario** para no gastar tokens ni tiempo en cada iteración de prueba y error.
> - **Cómo debes verificar tus cambios:** Tras editar código, **ejecuta únicamente `npm run lint` (y `npx tsc -b` cuando aplique)** para validar que no existan errores de linter ni de tipos, y entrégale al usuario la URL `?dev=<preset>` correspondiente para que él la pruebe.
> - **Única excepción:** Solo abre o interactúa con Chrome si el usuario te lo pide explícitamente en su mensaje (p. ej., para tomar capturas del informe contractual con la skill `informes-contrato`).

El juego exige **Google Chrome real con aceleración WebGPU** sobre contexto seguro (`http://localhost:5174` con `npm run dev` o `npm run docker:dev`). En desarrollo (`import.meta.env.DEV`) existe `src/app/devSession.ts`, que se elimina al 100 % en *builds* de producción:

1. **Solo si el usuario pide explícitamente abrir Chrome desde el agente:**
   - Usa las herramientas de **Chrome DevTools MCP** (plugin `chrome-devtools`) o `/browser` sobre Google Chrome local (no navegadores sin WebGPU).
   - Navega siempre con `?dev=<preset>` para omitir Google OAuth (`@correounivalle.edu.co`) y proteger Firestore real (`isDevUser` en `authStore.ts` desactiva lecturas/escrituras en `progressService.ts`, `userService.ts` y `adminService.ts`).
2. **URLs completas y casos de prueba disponibles (`http://localhost:5174`):**
   - **Desafío 1 — Villa de Boj, Casa de Imeri y Pantano de la Tristeza:**
     - `http://localhost:5174/mundo?dev=1` (alias: `http://localhost:5174/mundo?dev=villa`, `http://localhost:5174/mundo?dev=desafio1`) — Puerta de Villa de Boj desde cero (`x: -39, y: 12.4, z: 18`).
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
     - `http://localhost:5174/login?dev=admin` — Inicio de sesión único: como la cuenta es administradora (lista `VITE_ADMIN_EMAILS` o `role: 'admin'` en su perfil) redirige sola a `/admin`; cualquier otra cuenta sigue como estudiante (registro → personaje → mundo). Desde el panel, «Ver Mundo 3D» deja al administrador jugar como estudiante. `/admin` ya no tiene pantalla de inicio de sesión propia: sin sesión lleva a `/login`.
   - **Modificadores combinables en cualquier URL (`&vidas=`, `&bonos=`, `&vida=`, `&dialogo=`, `&mochila=`, `&avatar=`, `&perdidos=`, `&spawn=`):**
     - Puedes combinar cualquier preset base con:
       - `&vidas=1` · `&vidas=2` · `&vidas=3` (fija 1, 2 o 3 estrellas base; ej.: `http://localhost:5174/mundo?dev=bosque&vidas=1`).
       - `&bonos=0` · `&bonos=1` · `&bonos=hada` · `&bonos=2` (activa 0, 1 o los 2 bonos con sus estrellas extra e ítems en mochila; ej.: `http://localhost:5174/mundo?dev=tuneles&vidas=3&bonos=2`).
       - `&vida=15` (inicia con 15 PV de salud para probar morir rápido frente a un enemigo y ver el bajo o el consumo de estrella extra; ej.: `http://localhost:5174/mundo?dev=ogroSinGuante&vidas=1&vida=15`).
       - `&mochila=1` (abre la mochila al iniciar; ej.: `http://localhost:5174/mundo?dev=tuneles&bonos=2&mochila=1`).
       - `&dialogo=<id>` (abre cualquier diálogo al cargar) · `&cinematica=1` · `&avatar=Guerrero` · `&perdidos=Elfa,Gnomo` · `&spawn=x,y,z[,yaw]`.
   - **Identidades sandbox preconfiguradas (no cambiar por otros nombres ficticios en capturas):**
     - Estudiante por defecto (`?dev=1`, `?dev=registro`, `?dev=personaje`, etc.): **`Danna Guerrero Vargas`** (`danna.guerrero@correounivalle.edu.co`, código `202427615`, alias `Danna`, rol `student`).
     - Administrador (`/admin?dev=admin`): sesión iniciada como **`Fabian Stiven Valencia Cordoba`** (`fabian.cordoba@correounivalle.edu.co`, rol `admin`), mostrando en el listado de usuarios a la estudiante **`Danna Guerrero Vargas`** (`ESTUDIANTE`, Misiones 1 y 2 al 100 %) y al administrador **`Fabian Stiven Valencia Cordoba`** (`ADMIN`).
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

