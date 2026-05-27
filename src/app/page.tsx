"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { BookOpen, Gauge, Play, RotateCcw, Shield, Target, Trophy, Waves } from "lucide-react";
import { resetLocalMatch } from "@/lib/matchLifecycle";

const Scene = dynamic(() => import("@/components/game/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#05070a] text-sm font-black uppercase tracking-[0.4em] text-white/45">
      Loading flight deck
    </div>
  ),
});

export default function Home() {
  const [inRun, setInRun] = useState(false);

  const startRun = () => {
    resetLocalMatch();
    setInRun(true);
  };

  if (inRun) {
    return <Scene onExit={() => setInRun(false)} />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070a] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#f4c95d,#51d6a3,#65a6ff,#f65f5f)]" />
      <div className="absolute -right-44 top-20 h-[34rem] w-[34rem] rounded-full border border-white/10" />
      <div className="absolute -right-28 top-36 h-[22rem] w-[22rem] rounded-full border border-white/10" />

      <section className="relative z-10 flex min-h-screen items-center px-6 py-10">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-3 border border-[#f4c95d]/45 bg-[#f4c95d]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#f4c95d]">
              <Waves className="h-4 w-4" />
              PvE survival tracer bullet
            </div>

            <h1 className="text-balance text-6xl font-black uppercase leading-[0.88] tracking-normal text-white sm:text-8xl lg:text-9xl">
              Skybound
              <span className="block text-[#f4c95d]">Survival</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-white/62">
              Launch directly into an arcade survival run. This slice strips out login,
              lobby, realtime rooms, and the shrinking zone so the standalone PvE loop
              can be played and verified.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={startRun}
                className="inline-flex h-16 items-center justify-center gap-3 bg-[#f4c95d] px-8 text-lg font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#ffe08a] active:scale-[0.99]"
              >
                <Play className="h-5 w-5 fill-current" />
                Play
              </button>
              <button
                onClick={() => resetLocalMatch()}
                className="inline-flex h-16 items-center justify-center gap-3 border border-white/18 bg-white/[0.04] px-8 text-sm font-black uppercase tracking-[0.18em] text-white/70 transition hover:border-white/35 hover:bg-white/[0.08]"
              >
                <RotateCcw className="h-5 w-5" />
                Reset run state
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
              <Link href="/leaderboard" className="inline-flex items-center gap-2 transition hover:text-[#f4c95d]">
                <Trophy className="h-3.5 w-3.5" />
                Ranking
              </Link>
              <Link href="/docs" className="inline-flex items-center gap-2 transition hover:text-[#f4c95d]">
                <BookOpen className="h-3.5 w-3.5" />
                Asset docs
              </Link>
            </div>
          </div>

          <div className="relative min-h-[24rem] border border-white/14 bg-black/35 p-5 shadow-2xl backdrop-blur-md">
            <div className="absolute inset-x-5 top-5 flex items-center justify-between border-b border-white/10 pb-4 text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
              <span>Flight readiness</span>
              <span>Solo</span>
            </div>

            <div className="mt-20 grid gap-3">
              <ReadinessRow icon={<Gauge />} label="Immediate airborne spawn" value="Ready" />
              <ReadinessRow icon={<Shield />} label="Auth and lobby removed" value="Ready" />
              <ReadinessRow icon={<Target />} label="Combat HUD placeholder" value="Ready" />
              <ReadinessRow icon={<Waves />} label="Wave systems pending" value="Next" muted />
            </div>

            <div className="absolute bottom-5 left-5 right-5 border-t border-white/10 pt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/38">
              Run ends when the aircraft is destroyed
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ReadinessRow({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between border border-white/10 bg-white/[0.035] px-4 py-4 ${muted ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.12em] text-white/74">
        <span className="text-[#51d6a3] [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
        {label}
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f4c95d]">{value}</span>
    </div>
  );
}
