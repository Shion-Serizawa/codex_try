Project: 2ch-like BBS (Deno Fresh + Postgres)

Overview
- Frontend: Fresh (SSR + islands). UI default (Twind).
- Backend: API routes separated in code structure with middleware.
- DB: Postgres. Local via Docker (TCP driver). Deploy via Neon HTTP/WebSocket driver on Deno Deploy EA.
- Realtime: SSE with per-process BroadcastChannel, pluggable to shared pub/sub later.

Local Dev
- Copy `.env.example` to `.env` and adjust values. The app auto-loads `.env` locally (no manual exports needed).
- Start DB: `docker compose up -d`
- Run migrations: `deno task migrate:up`
- Seed initial data (optional): `deno task seed`
- Start server: `deno task start`

Deploy (Deno Deploy EA)
- Use Neon serverless Postgres and the `@neondatabase/serverless` driver (HTTP/WebSocket) — works in edge runtimes without raw TCP.
- Env:
  - NEON_DATABASE_URL=... (copy from Neon)
  - APP_SECRET=... (random, used for per-thread/day author hash)
- Optional moderation/admin:
  - ADMIN_SECRET=...

Path handling on Deploy
- Avoid using `Deno.cwd()` and relative file reads at runtime. This app uses URL-based imports and Fresh’s manifest.
- Migrations resolve paths relative to the script file (`import.meta.url`), which is robust in different runners, but migrations are intended for local/dev only.

Realtime
- Default: SSE using per-instance BroadcastChannel. Works for all clients hitting the same instance. To guarantee cross-instance fanout, add a shared pub/sub (e.g., Neon LISTEN/NOTIFY if supported by the chosen driver, or a managed Redis/Upstash HTTP pub/sub). Interface is abstracted under `backend/realtime/`.

Structure (high-level)
- backend/
  - db/ (drivers + client factory)
  - services/ (boards, threads, posts)
  - realtime/ (SSE broadcaster)
- db/migrations/ (SQL files)
- routes/ (Fresh pages)
- routes/api/ (Fresh API endpoints)
- scripts/ (migrate.ts)

Notes
- Self-delete moves the row into `deleted_posts` in a transaction, then deletes from `posts`.
- Author ID is per-thread (threadId + date + IP + APP_SECRET) short hash.
- Rate limiting & middleware will be in-memory initially; for Deploy scale, back with a remote store.
