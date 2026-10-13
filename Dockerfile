# ==============================================================================
# Etapa 1: Build (Compilación con Node.js Alpine)
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias limpias
COPY package*.json ./
RUN npm ci

# Variables de entorno Vite para compilación en producción
# Vite reemplaza import.meta.env.VITE_* en el bundle durante la compilación
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_ADMIN_EMAILS

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID \
    VITE_ADMIN_EMAILS=$VITE_ADMIN_EMAILS

# Copiar el código fuente y recursos estáticos
COPY . .

# Compilar la aplicación (TypeScript + Vite)
RUN npm run build

# ==============================================================================
# Etapa 2: Runner de producción (Nginx Alpine)
# ==============================================================================
FROM nginx:alpine AS runner

# Configuración personalizada de Nginx para SPA y modelos 3D
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los artefactos generados desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto HTTP estándar
EXPOSE 80

# Verificación de estado de salud del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
