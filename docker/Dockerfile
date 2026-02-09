# --- Étape 1 : Build ---
FROM oven/bun:latest AS build

LABEL authors="sebastienlucas"

WORKDIR /app

# Installation des dépendances
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copie du code source et build
COPY . .
RUN bun run build

# --- Étape 2 : Serveur de Production ---
FROM nginx:stable-alpine

LABEL authors="sebastienlucas"

# Configuration Nginx pour React Router (SPA)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security_headers.conf etc/nginx/snippets/security_headers.conf

# On récupère uniquement le build final
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]