"use client";

import type { ScoreEntry } from "@/lib/scoreboard";
import { Trophy } from "lucide-react";

export function LocalScoreboardTable({
  scores,
  highlightId,
  compact = false,
}: {
  scores: ScoreEntry[];
  highlightId?: string;
  compact?: boolean;
}) {
  if (scores.length === 0) {
    return (
      <div className="border border-dashed border-wf-hair p-6 text-center">
        <div className="mb-3 flex justify-center text-wf-ink">
          <Trophy className="h-6 w-6 stroke-1" />
        </div>
        <p className="text-sm text-wf-dim">No scores yet. Finish a run to set the first one.</p>
      </div>
    );
  }

  return (
    <div className="wf-frame overflow-x-auto">
      <table className="w-full min-w-[440px] text-left">
        <caption className="sr-only">Global top 10 scores</caption>
        <thead className="border-b border-wf-line text-[11px] font-medium text-wf-dim">
          <tr>
            {["RANK", "NAME", "SCORE", "WAVE", "KILLS"].map((label, index) => (
              <th key={label} scope="col" className={`px-3 py-3 sm:px-4 ${index > 1 ? "text-right" : ""}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scores.map((row, index) => {
            const highlighted = row.id === highlightId;
            return (
              <tr
                key={row.id}
                className={`border-t border-wf-hair text-sm uppercase sm:text-base [&>td]:px-3 sm:[&>td]:px-4 ${compact ? "[&>td]:py-2.5" : "[&>td]:py-4"} ${highlighted ? "bg-wf-ink text-black" : "text-wf-ink"}`}
              >
                <td className="font-light">{String(index + 1).padStart(2, "0")}</td>
                <td className="whitespace-nowrap">{row.name}</td>
                <td className="text-right tabular-nums">{row.score}</td>
                <td className="text-right tabular-nums">{row.wave}</td>
                <td className="text-right tabular-nums">{row.kills}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
