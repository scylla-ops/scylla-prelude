# syntax=docker/dockerfile:1

# ==========================================
# Étape 1 : Build Frontend (React/SPA)
# ==========================================
FROM oven/bun:latest AS frontend-build

ARG TARGETARCH

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ==========================================
# Étape 2 : Base cargo-chef
# ==========================================
FROM lukemathwalker/cargo-chef:latest-rust-1-bookworm AS chef

RUN apt-get update && apt-get install -y --no-install-recommends \
	pkg-config libssl-dev libclang-dev && \
	rm -rf /var/lib/apt/lists/*

WORKDIR /app/server

# ==========================================
# Étape 3 : Planner (génère recipe.json)
# ==========================================
FROM chef AS planner

COPY server/ .
RUN cargo chef prepare --recipe-path recipe.json

# ==========================================
# Étape 4 : Build Backend (Rust)
# ==========================================
FROM chef AS backend-build

ARG GIT_COMMIT=dev

# Cook dependencies — cached en layer tant que recipe.json ne change pas
COPY --from=planner /app/server/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# Build application — seul le code source est recompilé
COPY server/ .
ENV GIT_COMMIT=${GIT_COMMIT}
RUN cargo build --release && \
	cp /app/server/target/release/server /app/server-bin

# ==========================================
# Étape 5 : Final Image
# ==========================================
FROM debian:bookworm-slim

LABEL authors="sebastienlucas"

RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates && \
	rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=frontend-build /app/dist /app/dist
COPY --from=backend-build /app/server-bin /app/server-bin

ENV HOST=0.0.0.0
ENV PORT=8080
ENV DIST_PATH="/app/dist"
ENV RUST_LOG="server=debug,tower_http=info"

EXPOSE 8080

CMD ["/app/server-bin"]
