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

### 1. Entorno de Desarrollo (`docker-compose.dev.yml`)

Levanta la aplicación con sincronización en vivo (**Hot Reload**):

```bash
# Con Docker Compose directamente:
docker compose -f docker-compose.dev.yml up --build

# O usando el script de npm:
npm run docker:dev
```

- La aplicación estará disponible en: [http://localhost:5174](http://localhost:5174)
- Cada vez que guardes cambios en tu código, Vite los reflejará de inmediato.

Para detener el servicio:
```bash
docker compose -f docker-compose.dev.yml down
# O:
npm run docker:dev:down
```

### 2. Entorno de Producción (`docker-compose.prod.yml`)

Compila los activos de producción (TypeScript + Vite) y los sirve optimizados mediante un servidor Nginx con compresión gzip y headers de seguridad y caché para modelos 3D:

```bash
# Con Docker Compose directamente:
docker compose -f docker-compose.prod.yml up --build -d

# O usando el script de npm:
npm run docker:prod
```

- La aplicación estará disponible en: [http://localhost:8080](http://localhost:8080)

Para detener el servicio (opcionalmente eliminando la imagen con `--rmi all`):
```bash
docker compose -f docker-compose.prod.yml down --rmi all
# O:
npm run docker:prod:down
```

Para reconstruir desde cero eliminando la imagen previa:
```bash
npm run docker:prod:clean
# O:
docker compose -f docker-compose.prod.yml down --rmi all && docker compose -f docker-compose.prod.yml up --build -d
```

### 3. Limpieza de imágenes (RMI y Prune)

Si deseas eliminar manualmente las imágenes creadas:
```bash
# Eliminar la imagen de producción:
docker rmi brillo-en-la-montana:prod

# Eliminar la imagen de desarrollo:
docker rmi brillo-en-la-montana:dev

# Limpiar capas e imágenes huérfanas/intermedias (<none>):
docker image prune -f
# O:
npm run docker:prune
```



### 4. Usar Docker directamente (sin compose)

Construir la imagen:
```bash
docker build -t brillo-en-la-montana:latest .
```

Ejecutar el contenedor:
```bash
docker run -d -p 8080:80 --name brillo-en-la-montana brillo-en-la-montana:latest
```

