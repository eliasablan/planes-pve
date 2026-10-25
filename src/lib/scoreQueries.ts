import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getGlobalScores, ScoreServiceError, type RunSession } from "./scoreService";

export const globalScoreboardQuery = queryOptions({
  queryKey: ["leaderboard"],
  queryFn: ({ signal }) => getGlobalScores(signal),
  staleTime: 30_000,
  // Retry a transient read once; conflicts, rate limits, and invalid requests need an explicit retry.
  retry: (failures, error) => failures < 1 && (!(error instanceof ScoreServiceError) || error.status >= 500),
});

export function saveArcadeNameMutation(client: QueryClient, session: Pick<RunSession, "saveName"> | null) {
  return mutationOptions({
    mutationFn: (name: string) => {
      if (!session) throw new Error("This run was not registered. Please start a new run.");
      return session.saveName(name);
    },
    retry: false,
    onSuccess: async (result) => {
      // A ranking read started before this save must not overwrite the returned, newer ranking.
      await client.cancelQueries({ queryKey: globalScoreboardQuery.queryKey });
      client.setQueryData(globalScoreboardQuery.queryKey, result.scores);
    },
  });
}
