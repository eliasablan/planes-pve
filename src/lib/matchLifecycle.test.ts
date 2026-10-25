import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { useGameStore } from "../store/useGameStore";
import { finishLocalMatch, pauseLocalMatch, resetLocalMatch, resumeLocalMatch, startLocalMatch } from "./matchLifecycle";
import { clearRunTracking, getCurrentRunSession } from "./scoreService";

let now = 1000;
let clock: ReturnType<typeof spyOn>;
let network: ReturnType<typeof spyOn<typeof globalThis, "fetch">>;
let requests: { path: string; body: Record<string, unknown> }[];
async function recordRequest(input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) {
  const body = JSON.parse(options?.body as string);
  requests.push({ path: String(input), body });
  return Response.json(String(input) === "/api/runs" ? { runId: "run-1", startedAt: "2026-10-24T00:00:00Z" } : { status: body.status });
}
beforeEach(() => {
  clearRunTracking();
  useGameStore.getState().resetGame();
  now = 1000;
  requests = [];
  clock = spyOn(Date, "now").mockImplementation(() => now);
  network = spyOn(globalThis, "fetch").mockImplementation(recordRequest as typeof fetch);
});
afterEach(() => {
  clearRunTracking();
  clock.mockRestore();
  network.mockRestore();
  useGameStore.getState().resetGame();
});

test("strict-mode repeated start registers one run; finish excludes pauses and is sent once", async () => {
  startLocalMatch();
  startLocalMatch();
  now = 2000;
  pauseLocalMatch();
  now = 12000;
  resumeLocalMatch();
  now = 14000;
  finishLocalMatch();
  finishLocalMatch();
  await getCurrentRunSession()!.sync();
  expect(requests.filter(r => r.path === "/api/runs")).toHaveLength(1);
  expect(requests.at(-1)?.body).toEqual({ score: 0, wave: 1, kills: 0, durationMs: 3000, status: "completed" });
});

test("exit during pause records active duration and a restart uses a fresh credential", async () => {
  startLocalMatch();
  const abandoned = getCurrentRunSession()!;
  now = 2000;
  pauseLocalMatch();
  now = 12000;
  resetLocalMatch();
  await abandoned.sync();
  expect(requests.at(-1)?.body).toEqual({ score: 0, wave: 1, kills: 0, durationMs: 1000, status: "abandoned" });
  startLocalMatch();
  const registrations = requests.filter(r => r.path === "/api/runs");
  expect(registrations).toHaveLength(2);
  expect(registrations[0].body.requestId).not.toBe(registrations[1].body.requestId);
});

test("failed finish can retry the same frozen metrics, without duplicate concurrent submissions", async () => {
  startLocalMatch();
  let failed = false;
  network.mockImplementation((async (input, options) => {
    if (String(input).endsWith("/finish") && !failed) {
      failed = true;
      throw new Error("offline");
    }
    return recordRequest(input, options);
  }) as typeof fetch);
  now = 4000;
  finishLocalMatch();
  const session = getCurrentRunSession()!;
  await expect(session.sync()).rejects.toThrow();
  expect(session.getSnapshot().status).toBe("error");
  useGameStore.getState().addScore(999);
  await Promise.all([session.sync(), session.sync()]);
  expect(session.getSnapshot().status).toBe("synced");
  expect(requests.filter(r => r.path.endsWith("/finish"))).toHaveLength(1);
  expect(requests.at(-1)?.body.score).toBe(0);
});
