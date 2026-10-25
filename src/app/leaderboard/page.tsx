import { GlobalScoreboardPanel } from "@/components/ui/GlobalScoreboardPanel";
import { IslandBackdrop } from "@/components/ui/IslandBackdrop";
import { SiteNav } from "@/components/ui/SiteNav";

export default function Leaderboard() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-wf-ink">
      <IslandBackdrop aircraft={false} className="absolute inset-0 h-full w-full opacity-40" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col gap-4 p-4 sm:p-6">
        <SiteNav current="/leaderboard" />
        <section className="wf-frame mx-auto my-auto w-full max-w-4xl p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-4 border-b border-wf-hair pb-6 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-5xl font-light leading-none sm:text-6xl">
              High scores <span className="text-[0.4em] font-normal text-wf-dim">{"// Top 10"}</span>
            </h1>
            <p className="max-w-sm text-sm leading-6 text-wf-dim">
              The best survival runs, shared across pilots and devices.
            </p>
          </div>
          <GlobalScoreboardPanel />
        </section>
      </div>
    </main>
  );
}
