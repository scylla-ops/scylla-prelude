# syntax=docker/dockerfile:1

# ==========================================
# Étape 1 : Build Frontend (React/SPA)
# ==========================================
FROM oven/bun:latest AS frontend-build

ARG TARGETARCH

WORKDIR /app

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-cache-${TARGETARCH} \
	bun install --frozen-lockfile

COPY . .
RUN bun run build

# ==========================================
# Étape 2 : Build Backend (Rust)
# ==========================================
FROM rust:bookworm AS backend-build

ARG TARGETARCH

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
	pkg-config libssl-dev libclang-dev && \
	rm -rf /var/lib/apt/lists/*

COPY server/ ./server/

WORKDIR /app/server

RUN --mount=type=cache,target=/usr/local/cargo/registry,id=cargo-registry-${TARGETARCH} \
	--mount=type=cache,target=/usr/local/cargo/git,id=cargo-git-${TARGETARCH} \
	--mount=type=cache,target=/app/server/target,id=cargo-target-${TARGETARCH} \
	cargo build --release && \
	cp /app/server/target/release/server /app/server-bin

# ==========================================
# Étape 3 : Final Image
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
