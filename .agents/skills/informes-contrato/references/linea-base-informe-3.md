# Línea Base Entregada en el Informe 3 (Octubre 2026) y Guía para el Informe 4+

Este resumen condensa lo reportado en **Cuota 3 / Informe Mensual al Supervisor No. 3** (periodo: **01 al 31 de octubre de 2026**, entregado el **5 de noviembre de 2026**) para saber de inmediato qué es reutilizable y qué debe actualizarse en el **Informe 4** (noviembre 2026) o posteriores.

---

## 1. Resumen de Estado al Cierre del Informe 3

| Ítem | Estado en Informe 3 | Qué revisar / actualizar en Informe 4+ |
| :--- | :--- | :--- |
| **Actividad 1** (Infraestructura cloud, GitHub, CI/CD) | **100 % operativa** (React + TypeScript + Vite, Three.js WebGPU, R3F + Rapier, Firebase Auth/Firestore, Vercel CI/CD, GitHub DEXIA). Figuras 1–4. | Conservar base y Figuras 1–4 salvo que cambie infraestructura, dominio o contenedores/pipelines relevantes. |
| **Actividad 2** (Auth `@correounivalle.edu.co` + Ley 1581 + Registro 9 sedes) | **100 % operativa** (Google OAuth institucional, modal Habeas Data Ley 1581 / Decreto 1377, código `20xxxxxxx`, cascada de 9 sedes/facultades/programas). Figuras 5–9. | Conservar base y Figuras 5–9 (ya tienen a `Danna Guerrero Vargas`). |
| **Actividad 3** (Selección de avatares + UI/HUD) | **Operativa** (carrusel 2D de 12 arquetipos, nickname 16 caracteres, modelo 3D animado de `Elfa` como jugable/fallback, modal editar perfil, HUD con salud + 3 estrellas + mochila + controles móviles). Figuras 10–14. | Actualizar si se exportan e integran nuevos avatares 3D jugables además de la `Elfa` o nuevos elementos HUD del Desafío 3 / Bonos. |
| **Actividad 4** (Motor 3D, inventario, vidas y escenarios) | Motor WebGPU + Rapier + `PhysicsDoor` + sistema de 3 estrellas (*bajos*) + mochila 3D listos. **Desafío 1 (100 %)**, **Desafío 2 (100 %)**, **Desafío 3 (escenario 3D, colisiones, checkpoint y mochila listos; faltaban mecánicas interactivas)** y **Relato de Cierre (escenario 3D listo; faltaba diálogo final)**. Faltaban los **2 bonos** (choza de la estatua en el pantano y encuentro con el Hada en el bosque). Figuras 15–73. | **Foco principal en Informe 4:** documentar y capturar las mecánicas interactivas completadas del **Desafío 3** (diálogos/decisiones con Hedrig, Ogro, Túneles, espectro de Simona), el **Relato de Cierre** (diálogo con la Dríada y Cáliz en el Santuario) y los **2 bonos/acertijos**. |
| **Actividad 5** (Analíticas en tiempo real + Panel Admin DEXIA) | **Operativo para Misiones 1 y 2** (`/admin`, `onSnapshot`, filtros por 9 sedes/rol/búsqueda, ficha detallada, bajas/estrellas, exportación CSV UTF-8 BOM de **34 columnas**). Figuras 74–76. | **Actualizar en Informe 4:** cuando `adminService.ts` y `AdminPage.tsx` incluyan trazabilidad de **Misión 3**, **Bonos** y **Relato de Cierre** (y más columnas en el CSV), actualizar el número de columnas, actualizar `devAdminRecords()` para `Danna Guerrero Vargas` y volver a tomar las **Figuras del Panel Admin** (`/admin?dev=admin`). |
| **Actividad 6** (Pruebas de usabilidad Thinking Aloud con 8 estudiantes + informe técnico) | *"Durante este periodo no se contempla realizar esta actividad."* | Si en el periodo del Informe 4 se ejecutan las pruebas con los 8 estudiantes y el informe técnico, reemplazar por el desarrollo completo, hallazgos, métricas y evidencias fotográficas/tablas. |
| **Actividad 7** (Despliegue Beta 100 % jugable y refinamientos) | Beta al **70 %** en Vercel (pendiente 30 %: mecánicas Desafío 3 + cierre Santuario + 2 bonos). | Actualizar porcentaje al **100 % Beta jugable** cuando cierren Desafío 3, Santuario y los 2 bonos, más los refinamientos posteriores a las pruebas de usabilidad. |
| **Actividad 8** (Paso a producción final, manual de usuario y entrega de repositorio/código) | *"Durante este periodo no se contempla realizar esta actividad."* | Activar en el informe de entrega final cuando se elabore el manual de usuario y paquete `.zip` final. |
| **Actividad 9** (Reuniones quincenales Scrum con DEXIA) | **7 reuniones acumuladas:** Periodos previos = **Sprints 1 a 4** (4 reuniones). Periodo oct. 2026 = **Sprints 5, 6 y 7** (3 reuniones, Figuras 77–79). | En Informe 4: mover **Sprints 5, 6 y 7** a *"1. Avances realizados en periodos anteriores (7 reuniones: Sprints 1 al 7)"* y redactar en *"2. Avances desarrollados en el presente periodo"* los nuevos Sprints (p. ej. **Sprint 8**, **Sprint 9**...), reemplazando las figuras finales de Google Meet por las del nuevo mes. |
| **Actividad 10** (Soporte técnico y garantía de 1 mes post-producción) | *"Durante este periodo no se contempla realizar esta actividad."* | Mantener igual mientras no inicie el mes posterior a la entrega final; documentar cuando aplique. |
| **Producto 1** | Completado y documentado (referencia Figuras 1 a 14 en Supervisor). | Conservar / ajustar referencias de figuras si cambia la numeración. |
| **Producto 2** | En consolidación (motor + inventario + Desafíos 1 y 2 al 100 %; escenarios Desafío 3 y Cumbre integrados; referencia Figuras 15 a 73). | Pasar a **100 % completado** al cerrar la jugabilidad del Desafío 3, Relato de Cierre y los 2 bonos, ajustando el rango `(ver Figuras X a Y)`. |
| **Producto 3** | En desarrollo (Panel Admin Misiones 1–2, Beta 70 %; pruebas de usabilidad programadas tras Beta 100 %). | Actualizar con analíticas completas (Misiones 1–3 + bonos), Beta 100 % e informe técnico de pruebas de usabilidad. |
| **Producto 4** | *"Durante este periodo no se contempla realizar este producto."* | Documentar en la cuota final (producción ajustada, manual de usuario y `.zip` del repositorio). |

---

## 2. Catálogo de las 79 Figuras del Informe Mensual al Supervisor No. 3

Al extraer `Informe mensual al supervisor 3` con `scripts/inspect_docx.py`, encontrarás estas 79 imágenes en orden (más la imagen de la firma al final):

- **Figuras 1–4 (Act. 1 — Cloud / Repo, reutilizables):**
  - `Fig. 1`: Módulo de autenticación configurado en Firebase (`Tomado de Firebase.`)
  - `Fig. 2`: Módulo de persistencia en Cloud Firestore (`Tomado de Firebase.`)
  - `Fig. 3`: Videojuego desplegado en Vercel con CI/CD (`Tomado de Vercel.`)
  - `Fig. 4`: Repositorio en GitHub (`Tomado de GitHub.`)
- **Figuras 5–9 (Act. 2 — Login y Registro con Danna Guerrero Vargas, reutilizables):**
  - `Fig. 5`: Portada `/login`
  - `Fig. 6`: Regla de Firestore para `@correounivalle.edu.co`
  - `Fig. 7`: Formulario Completa tu Registro Estudiantil (`Danna Guerrero Vargas`)
  - `Fig. 8`: Selector con las 9 sedes de Univalle
  - `Fig. 9`: Modal de Tratamiento de Datos Personales (Ley 1581)
- **Figuras 10–14 (Act. 3 — Avatar y HUD, reutilizables salvo cambios de UI/avatares):**
  - `Fig. 10`: Vista Crea tu Aventurero (`Danna`, Elfa)
  - `Fig. 11`: Render 3D de la Elfa en Blender (`Elaboración propia.`)
  - `Fig. 12`: Modal Editar Perfil y Avatar (`Danna Guerrero Vargas`)
  - `Fig. 13`: HUD en partida (salud, 3 estrellas, hambre, mochila y barra rápida)
  - `Fig. 14`: Versión móvil con joystick virtual y botones táctiles
- **Figuras 15–34 (Act. 4 — Renders en Blender de escenarios, NPCs y enemigos, 100 % reutilizables):**
  - `Fig. 15`: Mapa general en Blender
  - `Figs. 16–23`: Escenarios en Blender (Villa de Boj, Pantano, Casa de Imeri, Bosque, Árbol/Casa del Elfo, Pueblo Minero/Casa de Hedrig, Túneles de la Cumbre, Cumbre y Santuario)
  - `Figs. 24–30`: Modelos en Blender de Anuncio del Alcalde, Imeri, Aldeano, Elfo, Enana Hedrig, Dríada y Hada
  - `Figs. 31–34`: Modelos en Blender de Gólem, Zumbador, Duende y Ogro
  - *(Si en Informe 4 se modelan en Blender activos adicionales como la Choza/Estatua del bono o el espectro de Simona, insértalos al final de este subgrupo y corre la numeración).*
- **Figuras 35–39 (Act. 4 — Locomoción y sistema de estrellas/bajos en WebGPU, reutilizables):**
  - `Figs. 35–38`: Elfa en reposo, caminando, corriendo y saltando
  - `Fig. 39`: Diálogo de primer bajo rendimiento con pérdida de una estrella
- **Figuras 40–53 (Act. 4 — Desafío 1 completo en WebGPU, reutilizables; agregar aquí Bono 1 del Pantano cuando exista):**
  - `Figs. 40–48`: Villa de Boj, Carta del Alcalde, Aldeano, Imeri, puerta física, interior Casa de Imeri y Mochila 3D del Desafío 1
  - `Figs. 49–53`: Combate con Gólem y Zumbadores, uso de Gema, Insecticida, Soga en pozo y diálogo de victoria del Desafío 1
- **Figuras 54–63 (Act. 4 — Desafío 2 completo en WebGPU, reutilizables; agregar aquí Bono 2 del Hada cuando exista):**
  - `Figs. 54–57`: Árbol y Casa del Elfo, diálogo con el Elfo, interior y Mochila 3D del Desafío 2
  - `Figs. 58–63`: Duendes, combate con Espada élfica, visor del Lente revelador (amarillo/rojo), manzana consumida, activación del Mapa y sendero dorado con muro oculto abierto
- **Figuras 64–73 (Act. 4 — Escenarios de Desafío 3 y Cumbre en WebGPU, ampliar en Informe 4 con mecánicas jugables):**
  - `Figs. 64–70`: Pueblo Minero, Casa de Hedrig (exterior/interior), Mochila 3D del Desafío 3, boca de la mina, galería interior y puente en los Túneles de la Cumbre
  - `Figs. 71–73`: Cumbre de la Desolación, exterior del Santuario e interior con el Cáliz
  - *(En Informe 4: añadir aquí las capturas interactivas con Hedrig, el Ogro, acertijos/mecánicas de Guante, Brújula y Muñeca en los túneles, espectro de Simona y el diálogo final con la Dríada en el Santuario).*
- **Figuras 74–76 (Act. 5 — Panel Admin DEXIA, recapturar en Informe 4 si se suma Misión 3 / Bonos):**
  - `Fig. 74`: Tabla general e indicadores con `Fabian Stiven Valencia Cordoba` (`ADMIN`) y `Danna Guerrero Vargas` (`ESTUDIANTE`)
  - `Figs. 75–76`: Ficha detallada de `Danna Guerrero Vargas` con Misión 1 y Misión 2
- **Figuras 77–79 (Act. 9 — Reuniones Google Meet del periodo oct. 2026, reemplazar en Informe 4 por las reuniones del nuevo mes):**
  - `Figs. 77–79`: Sprints 5, 6 y 7 (en Informe 4 solo van las capturas de las reuniones realizadas durante el nuevo periodo reportado, p. ej. Sprints 8 y 9).

