# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# 1. Base dependencies stage
# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# 2. Development stage (Vite dev server + HMR)
# -----------------------------------------------------------------------------
FROM deps AS dev
WORKDIR /app

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json .oxlintrc.json ./
COPY public ./public
COPY src ./src

EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--port", "5174"]

# -----------------------------------------------------------------------------
# 3. Production build stage (strict TypeScript check + Vite bundle)
# -----------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_ADMIN_EMAILS

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src

RUN npm run build

# -----------------------------------------------------------------------------
# 4. Production runtime stage (Nginx serving static SPA & compressed 3D assets)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS prod

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

