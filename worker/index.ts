import type { D1Database, RateLimit } from "@cloudflare/workers-types";
import { isValidArcadeName, normalizeArcadeName, SCOREBOARD_LIMIT, type ScoreEntry } from "../src/lib/scoreboard";
import { ApiError, hashToken, onlyKeys, readBody, validateResult } from "./validation";
import { GAME_VERSION, type GameVersion } from "../src/lib/pveRules";
import { handleAdmin } from "./admin";
import { privateId } from "./adminAuth";

export interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  RUN_START_LIMITER: RateLimit;
  API_LIMITER: RateLimit;
  ADMIN_LOGIN_LIMITER: RateLimit;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  ANALYTICS_SALT?: string;
}

type RunRow = {
  id: string;
  token_hash: string;
  started_at: string;
  game_version: GameVersion;
  status: string;
  score: number | null;
  wave: number | null;
  kills: number | null;
  duration_ms: number | null;
  name: string | null;
};

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

async function leaderboard(env: Env): Promise<ScoreEntry[]> {
  const { results } = await env.DB.prepare(`SELECT id, name, score, wave, kills,
    duration_ms AS durationMs, named_at AS createdAt FROM runs
    WHERE status = 'completed' AND name IS NOT NULL AND score > 0
    ORDER BY score DESC, wave DESC, kills DESC, duration_ms ASC, named_at ASC, id ASC LIMIT ?`)
    .bind(SCOREBOARD_LIMIT).all<ScoreEntry>();
  return results;
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const isStart = url.pathname === "/api/runs" && request.method === "POST";
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const limiter = isStart ? env.RUN_START_LIMITER : env.API_LIMITER;
  if (!(await limiter.limit({ key: ip })).success) throw new ApiError(429, "Too many requests. Please retry in a minute.");

  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("Origin");
    if ((origin && origin !== url.origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") {
      throw new ApiError(403, "Cross-origin submissions are not allowed.");
    }
  }
  if (url.pathname.startsWith("/api/admin/")) return handleAdmin(request, env);
  if (url.pathname === "/api/leaderboard") {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed.");
    return json({ scores: await leaderboard(env) });
  }
  if (isStart) {
    const body = await readBody(request);
    onlyKeys(body, ["requestId", "recoverOnly", "gameVersion", "browserId"]);
    const gameVersion = body.gameVersion ?? "survival-v1";
    if (typeof body.requestId !== "string" || (body.recoverOnly !== undefined && typeof body.recoverOnly !== "boolean") ||
      (gameVersion !== "survival-v1" && gameVersion !== GAME_VERSION) ||
      (body.browserId !== undefined && (typeof body.browserId !== "string" || !/^[a-f0-9]{64}$/.test(body.browserId)))) {
      throw new ApiError(400, "Invalid registration request.");
    }
    const tokenHash = await hashToken(body.requestId);
    const startedAt = new Date().toISOString();
    const country = (request as Request & { cf?: { country?: string } }).cf?.country;
    if (!body.recoverOnly) {
      const browserId = typeof body.browserId === "string" ? await hashToken(body.browserId) : null;
      const networkId = env.ANALYTICS_SALT && ip !== "local" ? await privateId(env.ANALYTICS_SALT, `network:${ip}`) : null;
      await env.DB.prepare(`INSERT INTO runs (id, token_hash, started_at, country, game_version, browser_id, network_id)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(token_hash) DO NOTHING`)
        .bind(crypto.randomUUID(), tokenHash, startedAt, country && /^[A-Z]{2}$/.test(country) && !["XX", "T1"].includes(country) ? country : null, gameVersion, browserId, networkId).run();
    }
    const run = await env.DB.prepare("SELECT id, started_at FROM runs WHERE token_hash = ?").bind(tokenHash).first<{ id: string; started_at: string }>();
    if (!run) throw new ApiError(404, "This run could not be registered. Please start a new run when the service is available.");
    return json({ runId: run.id, startedAt: run.started_at });
  }

  const route = /^\/api\/runs\/([a-f0-9-]{36})\/(finish|name)$/.exec(url.pathname);
  if (!route) throw new ApiError(404, "API route not found.");
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed.");
  const tokenHash = await hashToken(request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "");
  const runId = route[1];
  const findRun = () => env.DB.prepare("SELECT * FROM runs WHERE id = ? AND token_hash = ?").bind(runId, tokenHash).first<RunRow>();
  const run = await findRun();
  if (!run) throw new ApiError(404, "Run not found.");
  const body = await readBody(request);
  if (route[2] === "finish") {
    const result = validateResult(body, Date.now() - Date.parse(run.started_at), run.game_version);
    // The predicate makes simultaneous retries atomic; metrics become immutable on the first finish.
    await env.DB.prepare(`UPDATE runs SET status = ?, finished_at = ?, score = ?, wave = ?, kills = ?, duration_ms = ?
      WHERE id = ? AND token_hash = ? AND status = 'active'`)
      .bind(result.status, new Date().toISOString(), result.score, result.wave, result.kills, result.durationMs, runId, tokenHash).run();
    const stored = await findRun();
    if (!stored || stored.status !== result.status || stored.score !== result.score || stored.wave !== result.wave ||
      stored.kills !== result.kills || stored.duration_ms !== result.durationMs) {
      throw new ApiError(409, "This run already has a different result.");
    }
    return json({ runId, status: result.status });
  }

  onlyKeys(body, ["name"]);
  if (typeof body.name !== "string" || body.name.length > 64) throw new ApiError(400, "Invalid arcade name.");
  const name = normalizeArcadeName(body.name);
  if (!isValidArcadeName(name)) throw new ApiError(400, "Arcade name must be 3–12 letters or numbers.");
  if (run.status !== "completed" || !run.score) throw new ApiError(409, "Only a completed positive score can be named.");
  await env.DB.prepare("UPDATE runs SET name = ?, named_at = ? WHERE id = ? AND token_hash = ? AND name IS NULL")
    .bind(name, new Date().toISOString(), runId, tokenHash).run();
  if ((await findRun())?.name !== name) throw new ApiError(409, "This run was already saved with a different name.");
  const scores = await leaderboard(env);
  return json({ runId, scores, inTopTen: scores.some(entry => entry.id === runId) });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return await handleApi(request, env);
    } catch (error) {
      if (error instanceof ApiError) {
        const response = json({ error: error.message }, error.status);
        if (new URL(request.url).pathname.startsWith("/api/admin/")) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
        if (error.status === 429) response.headers.set("Retry-After", "60");
        return response;
      }
      // Do not log request bodies, bearer credentials, IP addresses, or database error details.
      console.error("Game data service unavailable");
      return json({ error: new URL(request.url).pathname.startsWith("/api/admin/")
        ? "No se pudieron cargar las estadísticas. Vuelve a intentarlo."
        : "Scores are temporarily unavailable. Please retry; your flight can continue." }, 503);
    }
  },
};

export default worker;
