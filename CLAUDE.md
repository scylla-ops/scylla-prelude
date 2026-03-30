# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Scylla Prelude is a devblog for the Scylla open-core CI platform. It's a monorepo with a React/TypeScript SPA frontend and a Rust (Axum) backend that serves the built frontend with security headers, compression, and caching.

## Commands

### Frontend (from repo root)
- `bun install` — install dependencies
- `bun run dev` — start Vite dev server (localhost:5173), proxies `/api` to `localhost:8080`
- `bun run build` — typecheck + build to `dist/`
- `bun run lint` — ESLint on `.ts`/`.tsx` files
- `bun run preview` — preview production build
- `bun run setup` — create `server/.env` from `.env.example`

### Backend (from `server/`)
- `cargo build` — build the server
- `cargo run` — run the server (serves `dist/` on port 8080)
- `cargo test` — run all integration tests (uses in-memory SurrealDB, no external DB needed)
- `cargo test <name>` — run a specific test (e.g. `cargo test health_check`, `cargo test scheduler`)
- `cargo test -- --nocapture` — show println output
- `cargo test -- --test-threads=1` — run tests serially (for debugging)

### Docker (from `docker/`)
- `docker compose up` — run production image behind reverse proxy
- `python3 scripts/build-multiarch.py` — multi-arch Docker build (amd64/arm64)

## Architecture

**Frontend** (`src/`): React 19 + React Router + Vite. Pages are in `src/pages/`, layout components in `src/components/layout/`, and UI primitives in `src/components/ui/` (shadcn/ui based on Radix). Styling uses Tailwind CSS 4. Animations use the `motion` library. Data fetching via `@tanstack/react-query` with API client in `src/lib/api.ts`.

**Backend** (`server/`): Axum web server with SurrealDB 3. Config via env vars in `server/.env` (see `server/.env.example`). Key modules:
- `routes/posts.rs` — public GET endpoints (list, get by slug, filtered by locale/tag)
- `routes/admin.rs` — JWT-protected CRUD (create, read, update, delete posts, upload images)
- `routes/auth.rs` — GitHub OAuth flow + JWT generation
- `routes/rss.rs` — RSS feed
- `routes/og.rs` — OG meta tag injection for social crawlers
- `scheduler.rs` — background task that auto-publishes scheduled posts every 60s
- `db/schema.surql` — SurrealDB schema definitions

**Auth flow**: GitHub OAuth → JWT. Admin access restricted to GitHub usernames listed in `ADMIN_GITHUB_USERNAMES` env var.

**Content model**: Posts live in SurrealDB table `post`. Composite unique key is `(slug, locale)`. Post statuses: `draft` → `published` or `scheduled`. Scheduled posts have a `published_at` timestamp and are auto-published by the background scheduler when due. Reading time is computed automatically on create/update.

**Testing** (`server/tests/api_integration.rs`): Integration tests use `axum-test` with an in-memory SurrealDB (`mem://`). Helper functions provide test app setup, JWT generation, and DB access. No external database required.

**Docker** (`docker/`): Multi-stage build — Bun builds frontend, Rust compiles server, both go into a minimal Alpine image.

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*` in imports
- **i18n**: English + French, managed via context in `src/i18n/`. Translation strings in `en.json`/`fr.json`. Locale detected from browser/localStorage.
- **Theme**: Dark/light mode via CSS class on `<html>`, persisted in localStorage
- **Rust edition**: 2024
- **TypeScript**: Strict mode enabled, ES2022 target
