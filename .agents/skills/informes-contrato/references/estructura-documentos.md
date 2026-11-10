# Estructura Institucional, Metadatos Fijos y Reglas de Formato

## 1. Metadatos Contractuales Inmutables

Usa siempre estos datos exactos en ambos informes sin parafrasear el objeto legal ni cambiar identificaciones:

- **Contratista:** `FABIAN STIVEN VALENCIA CORDOBA` (`Fabian Stiven Valencia Córdoba` en prosa/correo; `Fabian Stiven Valencia Cordoba` en el pie de firma del Informe Mensual al Supervisor)
- **Cédula / NIT:** `C.C. 1143981068` · `NIT: 1143981068-9`
- **Profesión:** `Ingeniero de Sistemas`
- **Correo institucional:** `fabian.cordoba@correounivalle.edu.co`
- **No. de Orden Contractual:** `030.021.022.2101.22.2026`
- **Valor total del contrato:** `$16.000.000`
- **Supervisora:** `María Helena Pinzón Cárdenas`
- **Dependencia:** `Vicerrectoría académica - Dirección de Desarrollo Estudiantil y Éxito Académico` (`DEXIA`)
- **Objeto del Contrato (literal):**
  > Prestación de servicios profesionales para la creación de personajes, mecánicas, escenas del videojuego “Brillo en la Montaña” usando Unity 3D gráfico, de acuerdo con establecido con el Convenio Especial BID No. CO1.PCCNTR.9516325 de 2026, en el marco del CONPES 4122 y el Contrato de Préstamo No. 5850/OC componente 2.
- **Nota arquitectónica obligatoria en Actividad 1:** Explicar siempre que, en concertación con el equipo de **DEXIA** y con aprobación de la supervisión, el apartado gráfico 3D se implementó en **arquitectura Web 3D moderna basada en React (TypeScript y Vite), Three.js con WebGPU y React Three Fiber**, permitiendo acceso inmediato desde navegadores de computador y celular sin descargas ni ejecutables locales, con integración directa en la nube (Firebase + Vercel + GitHub).
- **Enlaces oficiales de producción y repositorio:**
  - Producción: `https://brillo-en-la-montana.vercel.app/`
  - Repositorio GitHub: `https://github.com/brilloenlamontana/brillo-en-la-montana`

---

## 2. Comparativa entre los Dos Documentos Mensuales

| Aspecto | Documento 1: `INFORME DE ACTIVIDADES Cuota <N> Fabian Stiven Valencia.docx` | Documento 2: `Informe mensual al supervisor <N> - Fabian Stiven Valencia Cordoba.docx` |
| :--- | :--- | :--- |
| **Propósito** | Formato contractual financiero/administrativo de cobro de cuota. | Informe técnico ejecutivo al supervisor con todas las evidencias visuales verificables. |
| **Diseño base** | Tablas institucionales con bordes. | Texto corrido con viñetas (`●`) + figuras centradas en formato APA 7. |
| **Fotografías / Capturas** | **Ninguna** (0 imágenes de evidencia). | **Sí, exhaustivas** (`Figura 1` a `Figura M`, numeradas sin saltos). |
| **Tono y extensión** | Prosa técnica detallada dentro de cada celda de actividad/producto. | Viñetas claras, directas y concisas que enlazan cada logro con `(ver Figura X)` o `(ver Figuras X a Y)`. |
| **Cierre de firmas** | Tabla final de 2 columnas: `Firma Contratista FABIAN STIVEN VALENCIA CÓRDOBA` \| `Firma Supervisor MARIA HELENA PINZÓN CARDENAS`. | Firma manuscrita **encima del nombre** `Fabian Stiven Valencia Cordoba` (`CC. 1143981068` / `Ingeniero de Sistemas`), y debajo `VtoBo. Supervisor.` (`Directora de la Dirección de Desarrollo Estudiantil y Éxito Académico - DEXIA`). |

---

## 3. Reglas Específicas del `Informe mensual al supervisor <N>`

### 3.1 Encabezado exacto (Página 1)

```text
Santiago de Cali, <día> de <mes> de <año>

INFORME MENSUAL AL SUPERVISOR

No. De Informe: <N>
No. de Orden Contractual: 030.021.022.2101.22.2026
Supervisor: María Helena Pinzón Cárdenas
Objeto de Contrato: Prestación de servicios profesionales para la creación de personajes, mecánicas, escenas del videojuego "Brillo en la Montaña" usando Unity 3D gráfico, de acuerdo con establecido con el Convenio Especial BID No. CO1.PCCNTR.9516325 de 2026, en el marco del CONPES 4122 y el Contrato de Préstamo No. 5850/OC componente 2.

PRODUCTOS Y ACTIVIDADES REALIZADAS: En el periodo del <dd> al <dd> de <mes> de <año>, dando cumplimiento a la ejecución física de las actividades contractuales pactadas, se desarrollaron las siguientes actividades:
```

> **Cuidado crítico:** Nunca dejes una imagen suelta ni saltos de línea rotos entre el párrafo `PRODUCTOS Y ACTIVIDADES REALIZADAS...` y el título `Actividad específica No. 1:`.

### 3.2 Formato APA 7 para cada evidencia visual

Toda imagen del documento lleva exactamente estos 4 elementos consecutivos (mantener juntos con `keep_with_next` en título/imagen para no dejar títulos huérfanos al final de página):

1. **Figura X** *(en negrita, sin punto final)*
2. *Título descriptivo claro y breve* *(en cursiva, sin punto final)*
3. `[Imagen centrada, nítida, ancho uniforme ~14–15 cm]`
4. *Nota.* + atribución según origen:
   - Consolas cloud: `Nota. Tomado de Firebase.` / `Nota. Tomado de Vercel.` / `Nota. Tomado de GitHub.`
   - Vistas de la aplicación web (aunque se capturen en `localhost:5174` con `?dev=...`, la nota cita siempre la ruta oficial en producción):
     - `Nota. Tomado de https://brillo-en-la-montana.vercel.app/login`
     - `Nota. Tomado de https://brillo-en-la-montana.vercel.app/seleccion-personaje`
     - `Nota. Tomado de https://brillo-en-la-montana.vercel.app/mundo`
     - `Nota. Tomado de https://brillo-en-la-montana.vercel.app/admin`
   - Renders en Blender, diagramas propios y capturas de reuniones Google Meet:
     - `Nota. Elaboración propia.`

### 3.3 Enunciados literales de las 10 Actividades y 4 Productos

Respeta palabra por palabra el enunciado contractual de cada ítem en **ambos** documentos:

- **Actividad específica No. 1:** Configurar la infraestructura tecnológica en la nube, el repositorio de código fuente institucional (GitHub) y el esquema de integración continua (CI/CD) del juego.
- **Actividad específica No. 2:** Desarrollar el módulo de autenticación y habeas data con acceso restringido al dominio institucional @correounivalle.edu.co, en cumplimiento de la Ley 1581 de 2012 de Protección de Datos Personales.
- **Actividad específica No. 3:** Implementar el módulo de selección de avatares y adaptar los recursos gráficos e interfaz de usuario del videojuego.
- **Actividad específica No. 4:** Desarrollar el motor de juego con mecánicas de exploración libre, resolución de acertijos, sistema de inventario y mapa de decisiones condicionales, integrando la totalidad de los escenarios narrativos previstos.
- **Actividad específica No. 5:** Implementar el módulo de analíticas con base de datos en tiempo real y el panel de administración exclusivo para DEXIA, que permita la trazabilidad de los jugadores (recorridos, decisiones, resultados) y la descarga autónoma de la información para análisis posterior.
- **Actividad específica No. 6:** Ejecutar pruebas de usabilidad y experiencia de usuario (protocolo Thinking Aloud con observación no participante) con una muestra de ocho (8) estudiantes mayores de edad, y elaborar el informe técnico de resultados con barreras de usabilidad y oportunidades de mejora.
- **Actividad específica No. 7:** Desplegar la versión beta 100% jugable para validación institucional y realizar los ajustes y refinamientos derivados de las pruebas.
- **Actividad específica No. 8:** Realizar el despliegue a producción del videojuego, elaborar el manual de usuario y efectuar la entrega total del repositorio y del código fuente.
- **Actividad específica No. 9:** Participar en las reuniones quincenales de sincronización con el equipo de DEXIA bajo el marco de trabajo ágil Scrum.
- **Actividad específica No. 10:** Brindar soporte técnico y garantía para la estabilización y corrección de errores durante un (1) mes posterior a la entrega final y paso a producción.
- **Producto 1:** Infraestructura en la nube configurada, repositorio GitHub enlazado al correo institucional de DEXIA con CI/CD, módulo de autenticación funcional, avatares adaptados e interfaz de usuario inicial.
- **Producto 2:** Motor de juego completamente desarrollado en su apartado jugable, con exploración libre, sistema de inventario e integración de todos los escenarios narrativos.
- **Producto 3:** Módulo de analíticas y panel de administración implementados; informe técnico de pruebas de usabilidad; versión beta 100% jugable desplegada para validación.
- **Producto 4:** Versión final ajustada y desplegada a producción, manual de usuario, repositorio completo y código fuente comprimido (.zip).

### 3.4 Posición de la firma en `Informe mensual al supervisor`

Al usuario le gusta expresamente que la imagen de su firma quede **encima de su nombre impreso** (`Fabian Stiven Valencia Cordoba`), no separada muy arriba ni debajo. Al construir el `.docx` nuevo:
- Lo más limpio es partir de una copia del `.docx` anterior o reinyectar `signature_drawing.xml` (extraído por `scripts/inspect_docx.py`) junto con su archivo de imagen en `word/media/` y relación en `word/_rels/document.xml.rels` exactamente en el párrafo del bloque de firma.

---

## 4. Plantilla de Correo al Equipo Proyecto MEN

Cuando el usuario confirme que subió los soportes a la carpeta `Informe <N>`:

- **Asunto:** `Entrega de documentos Informe <N> (Cuota <N>) – Orden Contractual No. 030.021.022.2101.22.2026 – Fabian Stiven Valencia Córdoba`
- **Cuerpo:**
  - Saludo formal a **Equipo Proyecto MEN**.
  - Indicar carpeta **`Informe <N>`**, periodo reportado (`del <inicio> al <fin>`) y Orden Contractual **No. 030.021.022.2101.22.2026** (proyecto videojuego *“Brillo en la montaña”* – DEXIA).
  - Listar los 3 archivos subidos:
    1. `INFORME DE ACTIVIDADES Cuota <N> Fabian Stiven Valencia`
    2. `Informe mensual al supervisor <N> - Fabian Stiven Valencia Cordoba`
    3. Soporte de seguridad social (`Planilla PILA <Mes Año>...pdf`) — advierte fuera del correo si el mes del archivo PILA requiere verificación frente al periodo de la cuota.
  - Firma institucional completa del contratista.

