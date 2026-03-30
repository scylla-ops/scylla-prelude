# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scylla Prelude is a devblog for the Scylla open-core CI platform. It's a monorepo with a React/TypeScript SPA frontend and a Rust (Axum) backend that serves the built frontend with security headers, compression, and caching.

## Commands

### Frontend (from repo root)
- `bun install` — install dependencies
- `bun run dev` — start Vite dev server (localhost:5173)
- `bun run build` — typecheck + build to `dist/`
- `bun run lint` — ESLint on `.ts`/`.tsx` files
- `bun run preview` — preview production build

### Backend (from `server/`)
- `cargo build` — build the server
- `cargo run` — run the server (serves `dist/` on port 8080)

### Docker (from `docker/`)
- `docker compose up` — run production image behind reverse proxy
- `python3 scripts/build-multiarch.py` — multi-arch Docker build (amd64/arm64)

## Architecture

**Frontend** (`src/`): React 19 + React Router + Vite. Pages are in `src/pages/`, layout components in `src/components/layout/`, and UI primitives in `src/components/ui/` (shadcn/ui based on Radix). Styling uses Tailwind CSS 4. Animations use the `motion` library.

**Backend** (`server/`): Axum web server with SurrealDB 3. Serves the SPA from `dist/` with fallback routing, applies security headers (CSP, X-Frame-Options, etc.), compression, and request tracing. API routes under `/api/v1/` include public post endpoints, RSS feed, GitHub OAuth auth, and admin CRUD. Config via env vars in `server/.env` (see `server/.env.example`).

**Content**: Blog posts are stored in SurrealDB (table `post`), managed via the admin UI at `/admin`. Each post has separate entries per locale (slug + locale = unique key). Posts are fetched from the API using `@tanstack/react-query` and rendered with `react-markdown`.

**Docker** (`docker/`): Multi-stage build — Bun builds frontend, Rust compiles server, both go into a minimal Alpine image.

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*` in imports
- **i18n**: English + French, managed via context in `src/i18n/`. Translation strings in `en.json`/`fr.json`. Locale detected from browser/localStorage.
- **Theme**: Dark/light mode via CSS class on `<html>`, persisted in localStorage
- **Rust edition**: 2024
- **TypeScript**: Strict mode enabled, ES2022 target
