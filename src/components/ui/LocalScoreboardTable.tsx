"use client";

import type { LocalScoreEntry } from "@/lib/localScoreboard";
import { Trophy } from "lucide-react";

export function LocalScoreboardTable({
  scores,
  highlightId,
  compact = false,
}: {
  scores: LocalScoreEntry[];
  highlightId?: string;
  compact?: boolean;
}) {
  if (scores.length === 0) {
    return (
      <div className="border border-dashed border-white/14 bg-white/[0.025] p-6 text-center">
        <div className="mb-3 flex justify-center text-[#f4c95d]">
          <Trophy className="h-6 w-6" />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.2em] text-white/56">No local scores yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[440px] text-left">
        <caption className="sr-only">Local top 10 scores</caption>
        <thead className="bg-white/[0.05] text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
          <tr>
            {["Rank", "Name", "Score", "Wave", "Kills"].map((label, index) => (
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
                className={`border-t border-white/10 text-xs font-black uppercase tracking-[0.1em] sm:text-sm [&>td]:px-3 sm:[&>td]:px-4 ${compact ? "[&>td]:py-3" : "[&>td]:py-5"} ${highlighted ? "bg-[#f4c95d]/12 text-white" : "text-white/86"}`}
              >
                <td className="text-[#f4c95d]">#{index + 1}</td>
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
