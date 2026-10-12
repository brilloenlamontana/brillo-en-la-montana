# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

---

## 🐳 Despliegue con Docker

### Requisitos previos
- Tener instalado [Docker](https://www.docker.com/) y Docker Compose.
- Tener configurado el archivo `.env` en la raíz (puedes basarte en `.env.example`).

### 1. Iniciar en modo Desarrollo (Predeterminado con Hot Reload)

Para iniciar el contenedor con sincronización automática de código en vivo:

```bash
docker compose up --build -d
```

La aplicación estará disponible en: [http://localhost:5174](http://localhost:5174)

Cada vez que guardes código en tu editor, el navegador se actualizará automáticamente sin necesidad de reconstruir el contenedor.

Para detener el servicio:
```bash
docker compose down
```

### 2. Iniciar en modo Producción (Nginx)

Si deseas probar la versión final compilada con Nginx:

```bash
docker compose --profile prod up --build -d app-prod
```

La aplicación estará disponible en: [http://localhost:8080](http://localhost:8080)



### 3. Usar Docker directamente (sin compose)

Construir la imagen:
```bash
docker build -t brillo-en-la-montana:latest .
```

Ejecutar el contenedor:
```bash
docker run -d -p 8080:80 --name brillo-en-la-montana brillo-en-la-montana:latest
```

