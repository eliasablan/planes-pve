# Skybound Survival

A browser airplane survival game built with Next.js 16, React 19, Three.js, Rapier and Zustand. Cloudflare Workers serves the static Next.js export and a same-origin API; D1 stores run history and the shared top ten. No account is needed to play.

Play at [planes.eablan.dev](https://planes.eablan.dev). The [Workers URL](https://planes-pve.eliasgui32.workers.dev) serves the same application and shared scores.

## Local development

Use Bun 1.3.4 and a current Node.js runtime (the D1 integration suite runs in Node).

```bash
bun install --frozen-lockfile
bun dev
```

`bun dev` builds the frontend, applies local D1 migrations and starts Wrangler at `http://localhost:8787`. D1 data persists under ignored `.wrangler/state/`. After frontend changes, rebuild and restart; Worker source changes reload automatically. `bun run dev:ui` provides Next.js hot reload on port 3000 for UI work, but that server does not serve the Worker API. Use Wrangler for the complete game, score saving and ranking flow.

```bash
bun run build                 # Next.js static export into out/
bun run db:migrate:local
bun run preview               # Serve the existing export in workerd
bun test                      # Gameplay and client lifecycle tests
bun run test:worker            # Isolated workerd + D1 integration tests
bun run typecheck
bun run lint
```

`next start` is not used: production is a static frontend with a separate Worker API. Server Actions, SSR and other Next.js server features require a deployment architecture change. The existing Google font is fetched at build time; game models, images, JS and physics assets are served from the export.

## Cloudflare deployment

The nonsecret account ID, D1 database ID, Worker name and rate-limit namespaces are in `wrangler.jsonc`. The `DB` binding is available only inside the Worker. Gameplay needs no database URL or public token. The private statistics panel uses three Worker secrets described below. Wrangler's OAuth login or a restricted CI API token supplies deployment credentials; never commit credentials or enable verbose HTTP logging around authenticated package managers.

For this account, authenticate with the needed deployment scopes when necessary:

```bash
bunx wrangler login --scopes account:read user:read workers:write workers_scripts:write workers_routes:write zone:read d1:write ssl_certs:write
bun run deploy
```

`deploy` builds, applies remote D1 migrations, then publishes the Worker and assets. For a new account, create a new database with `bunx wrangler d1 create planes-pve`, replace both IDs in `wrangler.jsonc`, and apply the same migration. IDs are environment-specific, not secrets. A fresh deployment should be verified on its `workers.dev` hostname before a custom-domain cutover; see the [migration record](docs/plans/2026-10-24-cloudflare-continuidad.md) for actual provisioning, URLs, verification and remaining work.

The former Vercel project can remain available for rollback. Do not delete it or its domains as part of normal Workers deployment. To roll back a Worker release, use `bunx wrangler rollback <previous-version-id>` after inspecting `bunx wrangler deployments list`; keep D1 data and only use schema changes compatible with both versions. Domain rollback requires restoring the original Cloudflare DNS configuration recorded before cutover. A Worker rollback does not undo a D1 migration.

## Scores and game history

At takeoff, `POST /api/runs` uses a random browser credential to register one server-generated run ID, server start timestamp, approximate country from `request.cf`, game rules version and mode. The credential is hashed in D1. New clients also send an optional random, persistent browser identifier from `planes-pve:browser:v1` in local storage; D1 stores its SHA-256 hash. When `ANALYTICS_SALT` is configured, the Worker records an HMAC-SHA-256 network identifier from the Cloudflare connecting IP. Country can be unavailable or reflect a VPN; raw IP is not persisted. Explicit exit records `abandoned`; closing a tab may leave an `active` (unfinished) history row.

`POST /api/runs/:id/finish` records immutable score, wave, kills, active duration, finish timestamp and terminal status. Pauses affect active duration without shifting the original server start time. `POST /api/runs/:id/name` attaches a normalized 3–12 character arcade name to a completed positive result. All runs are retained, including zero scores, unnamed and displaced results. Repeated names can label different runs. Identical retries preserve the first timestamps; conflicting finishes or names return HTTP 409.

`GET /api/leaderboard` returns only the best ten named completed positive results, ordered by score descending, wave descending, kills descending, active duration ascending, name-save time ascending, then ID for an exact tie. The ranking index keeps reads bounded. History and country are not exposed by a public endpoint; authorized operators can query D1:

```bash
bunx wrangler d1 execute DB --remote --command "SELECT id, started_at, country, status, finished_at, score, wave, kills, duration_ms, name FROM runs ORDER BY started_at DESC LIMIT 100"
bunx wrangler d1 export DB --remote --output /private/tmp/planes-pve-backup.sql
```

Backups include hashed run credentials and country history: store them privately. See [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) for provider restore options; a remote restore has not been exercised by this migration. There is no automatic deletion of game history; monitor storage growth and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) before adding a retention policy.

Failures leave flight playable and appear as an unavailable service, never as an empty ranking or a successful save. Retry before leaving game over: pending results and credentials are in memory and do not survive refresh. A lost registration response can recover an existing run, but an offline run is never backdated into a new database entry. Old browser scores under `planes-pve:scoreboard:v1` remain untouched and are not uploaded. Audio and display preferences continue using local storage.

Requests have a 2 KiB JSON limit, origin checks, per-run bearer ownership, integer/range checks and broad survival plausibility checks. Rate-limit bindings allow approximately 20 registrations and 120 other API requests per minute per connecting IP in each Cloudflare location; shared networks share that allowance. [Cloudflare's limits are approximate and per location](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), and are not a strict global quota. The browser still computes results, so these controls do not make scores cheat-proof.

## Private flight statistics

Open `/control-de-vuelo` directly. It has no links from the game or navigation and declares `noindex, nofollow, noarchive`. The static page contains only the login shell; every statistics request is authenticated by the Worker. Hiding the URL is not the access control.

For local development, create `.dev.vars` using `.dev.vars.example` and set the chosen `ADMIN_PASSWORD` (1–256 characters), an independent random `ADMIN_SESSION_SECRET` (at least 32 characters) and an independent random `ANALYTICS_SALT`. `openssl rand -hex 32` can generate each random secret. The session secret protects cookie signatures independently of the login password's length. Keep `.dev.vars` private; it is ignored by Git. Before publishing the panel, set the three bindings as Cloudflare secrets:

```bash
bunx wrangler secret put ADMIN_PASSWORD
bunx wrangler secret put ADMIN_SESSION_SECRET
bunx wrangler secret put ANALYTICS_SALT
bun run deploy
```

Enter the chosen admin password, the random session secret and the independent salt at their respective prompts. Alternatively, `bunx wrangler deploy --secrets-file <private-json-or-env-file>` publishes code and secrets in one operation after the build and remote migrations; secrets omitted from that file are preserved. The usual deploy applies `0002_run_analytics.sql` before publishing the Worker. Without the password or a valid session secret, the API stays closed with HTTP 503; gameplay continues. Without the salt, network IDs remain unavailable. Changing `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` invalidates existing sessions. Keep `ANALYTICS_SALT` stable so a network retains its ID across releases.

Login uses an eight-hour signed `HttpOnly`, `SameSite=Strict` cookie, marked `Secure` on HTTPS, scoped to `/api/admin`. Passwords never enter local storage or a public build variable. Login attempts have a separate limit of five per minute per IP. Private API responses disable caching. Logout deletes the browser's session cookie; sessions expire at their original eight-hour deadline.

The dashboard shows activity by day (or month for periods longer than 90 days), countries, completed/abandoned/unfinished counts, distinct names/browsers/networks, coverage, score/wave/duration summaries, the 12 most frequent identities in each grouping, and a history table with 25 rows per page. Dates, country (including unknown), status, rules version and name/ID search filter every panel. Dates are inclusive UTC days applied to run start. Search matches a complete name without case sensitivity or an ID prefix, treating SQL wildcards literally. Chart data is also available in a table. Summary totals cover the entire selection rather than the current history page.

Names, browser profiles and anonymized networks are separate estimates, not verified people or physical computers. Browsers may be shared or reset; networks may be shared or change; names are only available when a player saved a result. Existing rows retain null IDs and are counted in run/country totals but not fabricated into unique players. Coverage shows how many selected runs have each identifier. An unfinished run means no final result was received, not proof that someone is online. Scores, waves and durations are only available for runs with a terminal result; no heartbeat or live player tracking is added.

## Project continuity

All five improvement sessions are complete. The [session summary](docs/plans/2026-10-23-prompts-mejoras-juego.md#seguimiento-de-sesiones) links their delivery records; the executable prompts and temporary browser evidence have been retired. [CONTEXT.md](CONTEXT.md) describes the active PvE architecture. The runtime and dependencies contain only the single-player game and its D1 score API.
