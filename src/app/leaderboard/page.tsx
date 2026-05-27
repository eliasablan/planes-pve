import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { LocalScoreboardPanel } from "@/components/ui/LocalScoreboardPanel";

export default function Leaderboard() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#05070a] p-6 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <section className="relative z-10 w-full max-w-4xl border border-white/14 bg-black/45 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#f4c95d]">
              <Trophy className="h-4 w-4" />
              Scoreboard local
            </div>
            <h1 className="text-5xl font-black uppercase leading-none tracking-normal">High scores</h1>
          </div>
          <p className="max-w-sm text-sm font-semibold leading-6 text-white/48">
            These scores are saved in this browser with localStorage. They do not sync
            between devices until the global ranking backend is added.
          </p>
        </div>

        <LocalScoreboardPanel />

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/45 transition hover:text-[#f4c95d]"
          >
            <ArrowLeft className="h-3 w-3" />
            Return to start
          </Link>
        </div>
      </section>
    </main>
  );
}
