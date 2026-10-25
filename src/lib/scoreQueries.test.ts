import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { MutationObserver, QueryClient, QueryObserver } from "@tanstack/react-query";
import { globalScoreboardQuery, saveArcadeNameMutation } from "./scoreQueries";
import type { SaveScoreResponse } from "./scoreService";
import type { ScoreEntry } from "./scoreboard";

const oldScores: ScoreEntry[] = [{ id: "old", name: "OLD", score: 100, wave: 1, kills: 1, durationMs: 1000, createdAt: "2026-10-24T00:00:00Z" }];
const newScores: ScoreEntry[] = [{ ...oldScores[0], id: "new", name: "ACE", score: 200 }];
const saved: SaveScoreResponse = { runId: "new", scores: newScores, inTopTen: true };
let client: QueryClient;
let network: ReturnType<typeof spyOn<typeof globalThis, "fetch">>;

function respondWith(implementation: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  network.mockImplementation(Object.assign(implementation, { preconnect: () => {} }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retryDelay: 0 }, mutations: { gcTime: Infinity } } });
  network = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ scores: oldScores }));
});
afterEach(() => { client.clear(); network.mockRestore(); });

describe("shared Global scoreboard cache", () => {
  test("concurrent readers share one request, and fresh reads reuse its result", async () => {
    const response = deferred<Response>();
    respondWith(() => response.promise);
    const first = client.fetchQuery(globalScoreboardQuery);
    const second = client.fetchQuery(globalScoreboardQuery);
    expect(network).toHaveBeenCalledTimes(1);
    response.resolve(Response.json({ scores: oldScores }));
    expect(await first).toEqual(oldScores);
    expect(await second).toEqual(oldScores);
    expect(await client.fetchQuery(globalScoreboardQuery)).toEqual(oldScores);
    expect(network).toHaveBeenCalledTimes(1);
  });

  test("an expired ranking is fetched again instead of staying stale forever", async () => {
    client.setQueryData(globalScoreboardQuery.queryKey, oldScores, { updatedAt: Date.now() - 30_001 });
    network.mockResolvedValue(Response.json({ scores: newScores }));
    expect(await client.fetchQuery(globalScoreboardQuery)).toEqual(newScores);
    expect(network).toHaveBeenCalledTimes(1);
  });

  test("saving updates both live readers and subsequent reads without another ranking request", async () => {
    await client.fetchQuery(globalScoreboardQuery);
    const first = new QueryObserver(client, globalScoreboardQuery);
    const second = new QueryObserver(client, globalScoreboardQuery);
    const stopFirst = first.subscribe(() => {});
    const stopSecond = second.subscribe(() => {});
    let writes = 0;
    const mutation = new MutationObserver(client, saveArcadeNameMutation(client, {
      saveName: async name => { expect(name).toBe("ACE"); writes++; return saved; },
    }));
    try {
      await mutation.mutate("ACE");
      expect(first.getCurrentResult().data).toEqual(newScores);
      expect(second.getCurrentResult().data).toEqual(newScores);
      expect(await client.fetchQuery(globalScoreboardQuery)).toEqual(newScores);
      expect(network).toHaveBeenCalledTimes(1);
      expect(writes).toBe(1);
    } finally { stopFirst(); stopSecond(); }
  });

  test("a pre-save ranking read is aborted and cannot overwrite the saved ranking", async () => {
    client.setQueryData(globalScoreboardQuery.queryKey, oldScores);
    const response = deferred<Response>();
    let requestSignal: AbortSignal | null | undefined;
    respondWith((_input, init) => {
      requestSignal = init?.signal;
      // Even a transport that completes after abort must not put its older result in the cache.
      return response.promise;
    });
    const staleRead = client.fetchQuery({ ...globalScoreboardQuery, staleTime: 0 }).catch(() => undefined);
    const mutation = new MutationObserver(client, saveArcadeNameMutation(client, { saveName: async () => saved }));
    await mutation.mutate("ACE");
    expect(requestSignal?.aborted).toBe(true);
    response.resolve(Response.json({ scores: oldScores }));
    await staleRead;
    await Promise.resolve();
    expect(client.getQueryData(globalScoreboardQuery.queryKey)).toEqual(newScores);
    expect(network).toHaveBeenCalledTimes(1);
  });

  test("transient reads retry once, while rate limits and invalid requests do not retry", async () => {
    respondWith(async () => Response.json({ error: "unavailable" }, { status: 503 }));
    await expect(client.fetchQuery(globalScoreboardQuery)).rejects.toThrow("unavailable");
    expect(network).toHaveBeenCalledTimes(2);
    for (const status of [400, 429]) {
      network.mockClear();
      respondWith(async () => Response.json({ error: "retry explicitly" }, { status }));
      await expect(client.fetchQuery(globalScoreboardQuery)).rejects.toThrow("retry explicitly");
      expect(network).toHaveBeenCalledTimes(1);
    }
  });

  test("a background refresh error retains the last ranking for display", async () => {
    client.setQueryData(globalScoreboardQuery.queryKey, oldScores, { updatedAt: Date.now() - 30_001 });
    respondWith(async () => Response.json({ error: "rate limited" }, { status: 429 }));
    await expect(client.fetchQuery(globalScoreboardQuery)).rejects.toThrow("rate limited");
    expect(client.getQueryData(globalScoreboardQuery.queryKey)).toEqual(oldScores);
  });

  test("failed naming leaves the ranking intact and waits for an explicit retry", async () => {
    client.setQueryData(globalScoreboardQuery.queryKey, oldScores);
    let writes = 0;
    const mutation = new MutationObserver(client, saveArcadeNameMutation(client, {
      saveName: async () => { writes++; if (writes === 1) throw new Error("offline"); return saved; },
    }));
    await expect(mutation.mutate("ACE")).rejects.toThrow("offline");
    expect(writes).toBe(1);
    expect(client.getQueryData(globalScoreboardQuery.queryKey)).toEqual(oldScores);
    expect(network).not.toHaveBeenCalled();
    await mutation.mutate("ACE");
    expect(writes).toBe(2);
    expect(client.getQueryData(globalScoreboardQuery.queryKey)).toEqual(newScores);
  });
});
