# ==========================================
# Étape 1 : Build Frontend (React/SPA)
# ==========================================
FROM oven/bun:latest AS frontend-build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ==========================================
# Étape 2 : Build Backend (Rust)
# ==========================================
FROM rust:alpine3.23 AS backend-build
WORKDIR /app

RUN apk add --no-cache musl-dev pkgconfig openssl-dev

COPY server/ ./server/

WORKDIR /app/server

RUN cargo build --release

# ==========================================
# Étape 3 : Final Image
# ==========================================
FROM alpine:latest

LABEL authors="sebastienlucas"

RUN apk add --no-cache libgcc ca-certificates

WORKDIR /app

COPY --from=frontend-build /app/dist /app/dist

COPY --from=backend-build /app/server/target/release/server /app/server-bin

ENV HOST=0.0.0.0
ENV PORT=8080
ENV DIST_PATH="/app/dist"
ENV RUST_LOG="server=debug,tower_http=info"

EXPOSE 8080

CMD ["/app/server-bin"]