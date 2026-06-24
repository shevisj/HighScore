# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

HighScore is an open-source leaderboard REST API for games, built on [Ts.ED](https://tsed.io/) (a decorator-based TypeScript framework over Express) backed by MongoDB. It also serves a server-rendered website (EJS views) to display leaderboards, plus Swagger docs and Prometheus metrics. Everything is configured through `HIGHSCORE_*` environment variables.

## Commands

```bash
npm run start          # dev server with hot-reload (ts-node-dev, --inspect); regenerates barrels first
npm run build          # production build: barrels + tsc → dist/
npm run start:prod     # run the compiled dist/ build (NODE_ENV=production)
npm run barrels        # regenerate src/home/index.ts and src/scores/index.ts barrel files

npm run test:unit      # run all Jest tests (spins up an in-memory MongoDB)
npm run test:lint      # eslint
npm run test:lint:fix  # eslint --fix

npm run docs:dev       # VitePress docs site (docs/) dev server
```

A `.env` file is required for `npm run start` — copy `.env.example`. Node >= 20 and a reachable MongoDB are required (the devcontainer provisions both).

### Running a single test

```bash
npx cross-env NODE_ENV=test MONGOMS_VERSION=7.0.14 MONGOMS_DISTRO=ubuntu-22.04 \
  jest --forceExit test/scores/ScoreController.spec.ts -t "GET /api/scores"
```

The `MONGOMS_*` env vars pin the `mongodb-memory-server` binary that Jest downloads/launches; tests bootstrap a real in-memory Mongo via `TestMongooseContext`, so the first run may download the mongod binary.

## Architecture

### Request flow & module layout
Each feature is a self-contained folder under `src/` following the Ts.ED Controller → Service → Model pattern:

- **`src/scores/`** — the core domain. `ScoreController` (mounted at `/api/scores`) handles CRUD; `ScoreService` does all DB work via MongoDB aggregation pipelines; `Score` is the Mongoose model + schema; `ScoreMiddleware` runs before every score route to strip profanity from `name`.
- **`src/home/`** — server-rendered website (mounted at `/`). `HomeController` renders EJS views (`views/`) and handles the platform-aware `/download` redirect. It reuses `ScoreService` for data.
- **`src/config/`** — one folder per cross-cutting concern (`envs`, `logger`, `mongoose`, `metrics`, `swagger`, `limit`). `config/index.ts` assembles the Ts.ED configuration object.
- **`src/Server.ts`** — the `@Configuration` root: mounts controllers, registers Express middleware (cors, compression, rate-limit, body-parser, sessions), wires Swagger/metrics/sessions in `$beforeRoutesInit`, and injects the `highscore.custom`/`download`/`privacy` settings consumed by views.
- **`src/index.ts`** — bootstraps `PlatformExpress`.

### Barrel files (important)
`src/home/index.ts` and `src/scores/index.ts` are **auto-generated** by `barrelsby` (config in `.barrelsby.json`) and recreated on every `start`/`build`. Do not edit them by hand. After adding/removing/renaming files in those folders, run `npm run barrels` (or just `npm run start`/`build`).

### Score ranking & the Groups system
- Ranking is computed at query time, not stored. `ScoreService.getScores` builds an aggregation pipeline that filters by `category` (scores are ranked within their category; absent category = `null`) and uses `$setWindowFields` + `$rank` over `value` descending. Filters for `_id`, `session`, `skip`, `limit` are appended after ranking so the `rank` reflects the full leaderboard.
- The `Score` model uses Ts.ED `@Groups` to control field exposure per operation: `read` / `create` / `update`. Notably `session` is excluded from all three (`!read`, `!create`, `!update`) — it is set server-side from `req.sessionID`, never accepted from or returned to clients. `rank`, `_id`, `createdAt`, `updatedAt` are read-only.
- Sessions are cookie-based (`express-session` + `connect-mongo`); `GET /api/scores/me` filters by the caller's `sessionID`.

### Configuration is entirely env-driven
All behavior is toggled via `HIGHSCORE_*` env vars (see `.env.example`). The `config/*` modules follow a consistent pattern of `isX()`/`useX()` helpers that return `undefined` when a feature is disabled, letting `Server.ts` conditionally wire them. Disable flags: `HIGHSCORE_DISABLE_DOCS`, `_METRICS`, `_BAD_WORDS`, `_RATE_LIMIT`. Docs (`/docs`) and metrics (`/metrics`) gain HTTP basic auth when their `USERNAME`/`PASSWORD` vars are set. The profanity filter (`bad-words`) is seeded with extra words from `config/ban.json`.

## Conventions

- **Commits** use [gitmoji](https://gitmoji.dev/) (e.g. `✨ My feature`). Branches are namespaced `feature/...` or `fix/...`. Keep commits atomic.
- Before opening a PR, ensure `npm run build` and `docker-compose up` both work (per CONTRIBUTING.md).
- Two tsconfigs: `tsconfig.json` is `noEmit` (editor/lint/dev), `tsconfig.compile.json` (extends it) does the real `dist/` emit for `npm run build`.

## Line endings (devcontainer + Windows host)

The committed blobs use **LF**. If the repo was cloned on Windows (e.g. GitHub Desktop, which defaults to `core.autocrlf=true`), the working-tree files become **CRLF**, and git inside this Linux devcontainer flags every file as modified — pure line-ending noise, not real changes. Keep checkouts as LF: set `git config core.autocrlf false` (or `input`) and run `git checkout -- .` to restore. A `* text=auto eol=lf` rule in `.gitattributes` would prevent recurrence.

## Deployment

The Docker image (`Dockerfile`) builds to `dist/` and runs under PM2 cluster mode (`processes.config.js`, 2 instances by default) via `pm2-runtime`. `MONGOMS_DISABLE_POSTINSTALL=1` prevents the test-only mongodb-memory-server from downloading a binary during image builds. Note the compiled app runs from `dist/src/`, so `Server.ts` resolves `views` as `../views` relative to `process.cwd()`.
