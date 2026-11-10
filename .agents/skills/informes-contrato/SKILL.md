---
name: informes-contrato
description: >-
  Genera, actualiza y audita los dos informes mensuales de ejecución contractual
  del videojuego "Brillo en la montaña" (DEXIA — Universidad del Valle): el
  INFORME DE ACTIVIDADES (Cuota N, formato tabular sin fotos) y el Informe
  mensual al supervisor No. N (formato narrativo con evidencias fotográficas en
  APA 7, capturas WebGPU sobre Google Chrome en modo sandbox y reuniones Scrum).
  Activa esta skill cuando el usuario pida elaborar, actualizar o revisar el
  Informe 4 (o cualquier cuota/informe mensual siguiente), reutilizar los
  informes previos (.docx o .pdf), o redactar el correo de entrega al Equipo
  Proyecto MEN.
---

# Generación de Informes Contractuales Mensuales (`Cuota N` + `Supervisor N`)

Esta skill estandariza la creación de los entregables mensuales de ejecución del contrato del videojuego **“Brillo en la montaña”** a partir de los dos documentos del periodo anterior (`N-1`) y de los avances reales del repositorio.

## Reglas Inquebrantables Antes de Empezar

1. **Consultar `graphify` primero (Regla #1 de `AGENTS.md` / `CLAUDE.md`):** Antes de explorar el código fuente para inventariar los avances del nuevo mes, ejecuta `graphify query "<módulo o desafío>"` y revisa `git log` / `CronogramaEscenas.md`.
2. **Protección total de Firestore real (Regla #2 de `AGENTS.md` / `CLAUDE.md`):** Jamás abras sesiones reales ni modifiques registros en Firebase Auth / Cloud Firestore para tomar capturas. Toda evidencia del juego y del panel administrativo se captura en Google Chrome (WebGPU) usando `?dev=<preset>` sobre `http://localhost:5174`.
3. **Identidades oficiales obligatorias en capturas:**
   - **Estudiante:** `Danna Guerrero Vargas` (`danna.guerrero@correounivalle.edu.co`, código `202427615`, alias `Danna`, rol `student`).
   - **Administrador (`/admin?dev=admin`):** `Fabian Stiven Valencia Cordoba` (`fabian.cordoba@correounivalle.edu.co`, rol `admin`).
   - Nunca inventes otros nombres ficticios (p. ej. *Valentina Gómez*) ni dejes visibles barras de marcadores personales o URLs `localhost:5174/?dev=...`.

---

## Flujo de Trabajo Paso a Paso

### Paso 1: Extraer e inspeccionar los informes del corte anterior (`N-1`)

Cuando el usuario entregue los archivos del periodo previo (`INFORME DE ACTIVIDADES Cuota <N-1>...` e `Informe mensual al supervisor <N-1>...`):

1. **Si están en `.docx` (recomendado):** ejecuta el extractor incluido en esta skill (usa solo librería estándar de Python):
   ```bash
   python .agents/skills/informes-contrato/scripts/inspect_docx.py "<ruta_cuota_previa.docx>" --out-dir "<carpeta_trabajo>/prev_cuota"
   python .agents/skills/informes-contrato/scripts/inspect_docx.py "<ruta_supervisor_previo.docx>" --out-dir "<carpeta_trabajo>/prev_supervisor"
   ```
   Esto genera en cada carpeta:
   - `content.md`: volcado íntegro de párrafos y celdas de tablas en orden de lectura.
   - `manifest.json`: inventario de tablas, figuras y mapeo exacto de cada imagen incrustada (`media/001_...`) con su número de `Figura`, título, fuente `Nota.` e indicador `is_anchor` (útil para conservar intactos los renders de Blender, las capturas de Firebase/Vercel/GitHub y el dibujo flotante de la firma).
   - `signature_drawing.xml` (en el informe al supervisor): nodo XML exacto de la firma posicionada encima del nombre del contratista.
2. **Si el usuario adjuntó `.pdf`:** extrae el texto por páginas para leer la redacción previa y pídele el `.docx` previo si necesitas reutilizar directamente los renders estáticos de Blender o el bloque editable con tu firma; si ya cuentas con la carpeta de imágenes del corte anterior, úsala directamente.
3. Lee las dos guías de referencia de esta skill antes de redactar:
   - [estructura-documentos.md](./references/estructura-documentos.md) — metadatos fijos del contrato, diferencias estructurales entre ambos informes, formato APA 7 de figuras y posición exacta de la firma.
   - [linea-base-informe-3.md](./references/linea-base-informe-3.md) — estado exacto entregado en Cuota 3 / Informe 3 (Actividades 1–10, Productos 1–4, Sprints 1–7 y catálogo de las Figuras 1–79) y qué cambia en el Informe 4 y siguientes.

---

### Paso 2: Identificar el delta del nuevo periodo y confirmar datos con el usuario

1. Consulta `graphify` y el historial reciente (`git log`) para detectar avances en:
   - `src/game/challenges/desafio3/`, `src/game/challenges/relatoCierre/`, bonos/acertijos, avatares 3D adicionales, UI/HUD o `src/services/adminService.ts` (nuevas métricas o columnas CSV).
2. Verifica o pregunta brevemente al usuario cualquier dato externo al repositorio que no te haya pasado aún:
   - **Fecha del informe** y **periodo reportado** (p. ej. `Del 01 al 30 de noviembre de 2026`).
   - **Valor de pago de la cuota** si cambia respecto a `$ 3.200.000`.
   - **Capturas y resumen de los nuevos Sprints** quincenales con DEXIA (Actividad 9: p. ej. Sprint 8, Sprint 9...).
   - **Resultados de pruebas de usabilidad** (Actividad 6 / Producto 3) o **manual de usuario / cierre a producción** (Actividad 8 / Producto 4) si aplican en este periodo.

---

### Paso 3: Generar el Documento 1 — `INFORME DE ACTIVIDADES Cuota <N> Fabian Stiven Valencia.docx`

Usa el `.docx` de la cuota anterior como plantilla base para preservar estilos, bordes de tabla, anchos y firmas:

1. Actualiza el título `INFORME DE ACTIVIDADES No. <N>`, `Fecha`, `Periodo` y `Valor Pago cuota`.
2. Mantén la justificación concertada con DEXIA en la **Actividad 1** (arquitectura **Web 3D con React, TypeScript, Vite y Three.js WebGPU** aprobada en lugar de ejecutable local en Unity).
3. Actualiza el texto técnico-ejecutivo acumulativo y del periodo en **Actividades específicas No. 1 a No. 10** y **Productos 1 a 4** (sin insertar fotografías en este documento).
4. En **Actividad específica No. 9 (Scrum)**:
   - Pasa todos los Sprints ya reportados en informes previos al bloque `1. Avances realizados en periodos anteriores (X reuniones: Sprints 1 al <K>)`.
   - Documenta únicamente las reuniones del mes reportado en `2. Avances desarrollados en el presente periodo (Y reuniones: Sprints <K+1>...)`.
5. Verifica que las **10 actividades** y los **4 productos** estén presentes; si alguno sigue fuera del alcance del mes, conserva la fórmula institucional: `Durante este periodo no se contempla realizar esta actividad.` / `Durante este periodo no se contempla realizar este producto.`

---

### Paso 4: Capturar evidencias nuevas en Chrome WebGPU y generar el Documento 2 — `Informe mensual al supervisor <N> - Fabian Stiven Valencia Cordoba.docx`

1. **Actualizar datos sandbox si hay nuevas misiones/métricas:**
   - Si en el código ya existen métricas de Misión 3, Relato de Cierre o bonos en `/admin`, actualiza `devAdminRecords()` en `src/services/adminService.ts` (y presets en `src/app/devSession.ts` si se requieren ubicaciones rápidas) para que la estudiante `Danna Guerrero Vargas` muestre el progreso actualizado y las fechas del periodo reportado. Si modificas código `.ts`, recuerda correr `npm run lint`, `npm run build` y `graphify update .` al terminar.
2. **Capturar pantallas en vivo sobre Google Chrome (WebGPU):**
   - Levanta el entorno local (`npm run dev` o `npm run docker:dev` en `http://localhost:5174`).
   - Navega siempre con `?dev=<preset>` (`?dev=desafio3`, `?dev=tuneles`, `?dev=cumbre`, `?dev=admin`, etc.) y espera a `window.__DEV_GAME__.status().ready === true` y `warming === false`.
   - Captura **únicamente el viewport del navegador** (nunca la barra de direcciones ni marcadores).
   - Comprueba visualmente cada toma: encuadre limpio, cero paredes negras pegadas a la cámara (*clipping*) y diálogos legibles.
   - Para capturas de reuniones Google Meet (Actividad 9), recorta cualquier barra superior de marcadores o pestañas personales del navegador antes de insertarlas.
3. **Ensamblar el `.docx` del Informe Mensual al Supervisor:**
   - Reutiliza de `prev_supervisor/media/` las figuras estáticas que siguen vigentes (Firebase, Vercel, GitHub, renders de Blender y capturas de etapas previas sin cambios) e intercala en orden lógico las nuevas capturas del periodo.
   - Numera todas las figuras de corrido (`Figura 1` a `Figura M`) bajo formato APA 7 (**Figura X** en negrita, *Título* en cursiva, imagen centrada y *Nota.* con fuente) y actualiza todos los llamados `(ver Figura X)` / `(ver Figuras X a Y)` en Actividades 1–10 y Productos 1–4.
   - **Firma del contratista (preferencia expresa del usuario):** conserva en el cierre la imagen de la firma **justo encima / ligeramente superpuesta sobre el nombre impreso** `Fabian Stiven Valencia Cordoba` (`CC. 1143981068` / `Ingeniero de Sistemas`), reutilizando el bloque/ancla de firma del `.docx` anterior, seguido más abajo por `VtoBo. Supervisor.` (`Directora de la Dirección de Desarrollo Estudiantil y Éxito Académico - DEXIA`).

---

### Paso 5: Auditoría obligatoria y correo de entrega

1. Ejecuta el validador automático sobre ambos `.docx` generados:
   ```bash
   python .agents/skills/informes-contrato/scripts/inspect_docx.py "<nuevo_cuota.docx>" --audit
   python .agents/skills/informes-contrato/scripts/inspect_docx.py "<nuevo_supervisor.docx>" --audit
   ```
2. Corrige cualquier advertencia antes de entregar (numeración de figuras con saltos, figuras sin citar en el texto, imagen colada antes de la Actividad 1, nombres no autorizados o productos faltantes).
3. Si tienes LibreOffice / Word disponible o el usuario te comparte el PDF exportado, revisa visualmente los saltos de página y el bloque de firma final.
4. Cuando el usuario suba los archivos a Drive (`Informe <N>`), redacta el correo formal para el **Equipo Proyecto MEN** siguiendo la plantilla en [estructura-documentos.md](./references/estructura-documentos.md#4-plantilla-de-correo-al-equipo-proyecto-men) (verificando que el mes de la planilla PILA coincida con el requerido para la cuota).

