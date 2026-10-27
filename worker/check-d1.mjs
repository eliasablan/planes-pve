import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";

const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  scriptPath: ".wrangler/test-worker.mjs",
  compatibilityDate: "2026-10-24",
  d1Databases: ["DB"],
  cf: { country: "VE" },
  ratelimits: {
    RUN_START_LIMITER: { namespace_id: "1001", simple: { limit: 100000, period: 60 } },
    API_LIMITER: { namespace_id: "1002", simple: { limit: 100000, period: 60 } },
  },
}));
let db;
const result = { score: 100, wave: 1, kills: 1, durationMs: 1000, status: "completed" };
const token = () => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
async function call(path, body, credential, headers = {}) {
  return mf.dispatchFetch(`https://game.test${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...(credential ? { Authorization: `Bearer ${credential}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function start(credential = token(), gameVersion) {
  const response = await call("/api/runs", { requestId: credential, ...(gameVersion ? { gameVersion } : {}) });
  assert.equal(response.status, 200);
  return { ...(await response.json()), credential };
}
async function finish(run, metrics = result) {
  return call(`/api/runs/${run.runId}/finish`, metrics, run.credential);
}
async function name(run, arcadeName = "ACE") {
  return call(`/api/runs/${run.runId}/name`, { name: arcadeName }, run.credential);
}

before(async () => {
  db = await mf.getD1Database("DB");
  const sql = await readFile(new URL("../migrations/0001_runs.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").filter(s => s.trim())) await db.prepare(statement).run();
});
beforeEach(async () => { await db.prepare("DELETE FROM runs").run(); });
after(async () => { await mf.dispose(); });

test("records server start, country and all finished/unfinished runs without publishing unnamed results", async () => {
  const run = await start();
  await start();
  assert.equal((await finish(run, { ...result, score: 0, kills: 0 })).status, 200);
  const { results } = await db.prepare("SELECT * FROM runs ORDER BY status").all();
  assert.equal(results.length, 2);
  assert.equal(results[0].status, "active");
  assert.equal(results[1].status, "completed");
  assert.equal(results[1].country, "VE");
  assert.equal(results[1].duration_ms, 1000);
  assert.equal(results[1].started_at, run.startedAt);
  assert.notEqual(results[1].token_hash, run.credential);
  const response = await call("/api/leaderboard");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { scores: [] });
  assert.equal((await name(run)).status, 409);
});

test("registration, completion and naming retries are atomic and preserve original timestamps", async () => {
  const credential = token();
  const registrations = await Promise.all(Array.from({ length: 5 }, () => start(credential)));
  assert.equal(new Set(registrations.map(r => r.runId)).size, 1);
  const run = registrations[0];
  const completions = await Promise.all(Array.from({ length: 5 }, () => finish(run)));
  assert.ok(completions.every(r => r.status === 200));
  const first = await db.prepare("SELECT finished_at FROM runs WHERE id = ?").bind(run.runId).first();
  const names = await Promise.all(Array.from({ length: 5 }, () => name(run, "ace-42")));
  assert.ok(names.every(r => r.status === 200));
  const saved = await db.prepare("SELECT named_at FROM runs WHERE id = ?").bind(run.runId).first();
  await name(run, "ACE42");
  assert.deepEqual(await db.prepare("SELECT named_at FROM runs WHERE id = ?").bind(run.runId).first(), saved);
  assert.deepEqual(await db.prepare("SELECT finished_at FROM runs WHERE id = ?").bind(run.runId).first(), first);
  assert.equal((await finish(run, { ...result, score: 160 })).status, 409);
  assert.equal((await name(run, "OTHER")).status, 409);
  assert.equal((await db.prepare("SELECT count(*) AS count FROM runs").first()).count, 1);
  const { scores } = await (await call("/api/leaderboard")).json();
  assert.equal(scores[0].name, "ACE42");
  assert.deepEqual(Object.keys(scores[0]).sort(), ["createdAt", "durationMs", "id", "kills", "name", "score", "wave"]);
});

test("concurrent different results for one run accept exactly one payload", async () => {
  const run = await start();
  const responses = await Promise.all([finish(run), finish(run, { ...result, score: 160 })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
});

test("validates old and new wave counts using each run's registered rules", async () => {
  const legacy = await start();
  const current = await start(token(), "survival-v2");
  const metrics = kills => ({ score: kills * 100 + 8170, wave: 20, kills, durationMs: 60_000, status: "completed" });
  await db.prepare("UPDATE runs SET started_at = ?").bind(new Date(Date.now() - 60_000).toISOString()).run();
  assert.equal((await db.prepare("SELECT game_version FROM runs WHERE id = ?").bind(legacy.runId).first()).game_version, "survival-v1");
  assert.equal((await db.prepare("SELECT game_version FROM runs WHERE id = ?").bind(current.runId).first()).game_version, "survival-v2");
  assert.equal((await finish(legacy, metrics(140))).status, 400);
  assert.equal((await finish(current, metrics(122))).status, 400);
  assert.equal((await finish(legacy, metrics(122))).status, 200);
  assert.equal((await finish(current, metrics(140))).status, 200);
  const recovered = await call("/api/runs", { requestId: legacy.credential, gameVersion: "survival-v2", recoverOnly: true });
  assert.equal((await recovered.json()).runId, legacy.runId);
  assert.equal((await db.prepare("SELECT game_version FROM runs WHERE id = ?").bind(legacy.runId).first()).game_version, "survival-v1");
  assert.equal((await call("/api/runs", { requestId: token(), gameVersion: "unknown" })).status, 400);
});

test("orders and cuts ten results using every tie-break, retaining the rest of history", async () => {
  // Seed SQL directly to exercise comparator ties independently of survival plausibility.
  const metrics = [
    [500, 2, 8, 20000, "2026-01-01T00:00:00.000Z"],
    [500, 3, 1, 20000, "2026-01-01T00:00:00.000Z"],
    [500, 2, 9, 20000, "2026-01-01T00:00:00.000Z"],
    [500, 2, 9, 10000, "2026-01-01T00:00:01.000Z"],
    [500, 2, 9, 10000, "2026-01-01T00:00:00.000Z"],
    ...Array.from({ length: 8 }, (_, i) => [100 - i, 1, 1, 1000, "2026-01-01T00:00:00.000Z"]),
  ];
  await Promise.all(metrics.map(async ([score, wave, kills, duration, saved], index) => {
    await db.prepare(`INSERT INTO runs (id, token_hash, started_at, game_version, status, finished_at, score, wave, kills, duration_ms, name, named_at)
      VALUES (?, ?, ?, 'test', 'completed', ?, ?, ?, ?, ?, 'ACE', ?)`)
      .bind(`run-${index}`, `token-${index}`, saved, saved, score, wave, kills, duration, saved).run();
  }));
  const { scores } = await (await call("/api/leaderboard")).json();
  assert.equal(scores.length, 10);
  assert.deepEqual(scores.slice(0, 5).map(r => r.id), ["run-1", "run-4", "run-3", "run-2", "run-0"]);
  assert.equal((await db.prepare("SELECT count(*) AS count FROM runs").first()).count, 13);
  const plan = await db.prepare(`EXPLAIN QUERY PLAN SELECT id FROM runs WHERE status = 'completed' AND name IS NOT NULL AND score > 0
    ORDER BY score DESC, wave DESC, kills DESC, duration_ms ASC, named_at ASC, id ASC LIMIT 10`).all();
  assert.match(JSON.stringify(plan.results), /runs_leaderboard/);
});

test("rejects forged ownership, cross-site posts, invalid fields, oversized bodies and implausible results", async () => {
  const run = await start();
  assert.equal((await call(`/api/runs/${run.runId}/finish`, result, token())).status, 404);
  assert.equal((await call("/api/runs", { requestId: token() }, null, { Origin: "https://other.test" })).status, 403);
  assert.equal((await call("/api/runs", { requestId: token(), country: "US" })).status, 400);
  assert.equal((await call("/api/runs", { requestId: "X".repeat(3000) })).status, 413);
  for (const invalid of [{ score: -1 }, { score: 1.5 }, { kills: 999 }, { wave: 0 }, { durationMs: 999999 }, { status: "active" }, { name: "ACE" }]) {
    assert.equal((await finish(run, { ...result, ...invalid })).status, 400, JSON.stringify(invalid));
  }
  assert.equal((await name(run)).status, 409);
  assert.equal((await finish(run)).status, 200);
  assert.equal((await name(run, "--")).status, 400);
});

test("recovers a lost start response without inventing a late start; records abandonment", async () => {
  const run = await start();
  const recovered = await call("/api/runs", { requestId: run.credential, recoverOnly: true });
  assert.equal((await recovered.json()).startedAt, run.startedAt);
  assert.equal((await call("/api/runs", { requestId: token(), recoverOnly: true })).status, 404);
  assert.equal((await finish(run, { ...result, status: "abandoned" })).status, 200);
  assert.equal((await name(run)).status, 409);
  assert.equal((await db.prepare("SELECT status FROM runs").first()).status, "abandoned");
});

test("database failure returns unavailable rather than an empty or successful response", async () => {
  await db.prepare("ALTER TABLE runs RENAME TO temporarily_unavailable").run();
  try {
    const response = await call("/api/leaderboard");
    assert.equal(response.status, 503);
    assert.equal(typeof (await response.json()).error, "string");
    assert.equal((await call("/api/runs", { requestId: token() })).status, 503);
  } finally {
    await db.prepare("ALTER TABLE temporarily_unavailable RENAME TO runs").run();
  }
  assert.equal((await call("/api/leaderboard")).status, 200);
});

test("rate-limit exhaustion returns 429 with a retry delay before any database writes", async () => {
  const limited = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    scriptPath: ".wrangler/test-worker.mjs",
    compatibilityDate: "2026-10-24",
    d1Databases: ["DB"],
    ratelimits: {
      RUN_START_LIMITER: { namespace_id: "2001", simple: { limit: 1, period: 60 } },
      API_LIMITER: { namespace_id: "2002", simple: { limit: 1, period: 60 } },
    },
  }));
  try {
    const request = () => limited.dispatchFetch("https://game.test/api/runs", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: token() }),
    });
    // This isolated database intentionally lacks a schema; the first request reaches D1, the second must not.
    assert.equal((await request()).status, 503);
    const blocked = await request();
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get("retry-after"), "60");
  } finally {
    await limited.dispose();
  }
});
