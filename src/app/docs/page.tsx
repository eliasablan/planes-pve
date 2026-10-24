import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BadgeCheck, FileText, ShieldCheck } from "lucide-react";
import { ASSET_POLICY, ASSET_SOURCES, BUNDLED_ASSET_TARGETS } from "@/lib/assetCredits";

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-[#0d1110] text-[#f2efe7]">
      <div className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-[#f2efe7]/10 pb-4">
          <Link href="/" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#f2efe7]/55 transition hover:text-[#f2efe7]">
            <ArrowLeft className="size-4" />
            Start
          </Link>
          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d8a24a]">Documentation</span>
        </header>

        <section className="grid gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="max-w-fit border-l-2 border-[#d8a24a] pl-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#d8a24a]">
                Asset record
              </p>
              <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
                Credits, licenses, and intake rules.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#f2efe7]/62">
                This page documents where visual resources may come from, what each license means for this PvE
                spin-off, and the checklist required before bundling third-party files.
              </p>
            </div>

            <div className="grid gap-3">
              <SummaryCard icon={<ShieldCheck className="size-4" />} label="Default" value="CC0 first" />
              <SummaryCard icon={<BadgeCheck className="size-4" />} label="Commercial intent" value="Portfolio only" />
              <SummaryCard icon={<FileText className="size-4" />} label="Bundled third-party files" value="1 aircraft model" />
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-[#f2efe7]/12 bg-[#151b18] p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#d8a24a]">Sound effects</h2>
              <p className="mt-4 text-sm leading-6 text-[#f2efe7]/58">
                Combat and supply sounds are synthesized in the browser with original Web Audio code.
                No third-party audio clips are bundled or downloaded.
              </p>
            </section>
            <section className="rounded-lg border border-[#f2efe7]/12 bg-[#151b18] p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#d8a24a]">Approved Sources</h2>
              <div className="mt-5 divide-y divide-[#f2efe7]/10">
                {ASSET_SOURCES.map((source) => (
                  <a
                    key={source.name}
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[0.8fr_1.2fr_auto]"
                  >
                    <div>
                      <p className="font-black uppercase tracking-[0.12em] text-[#f8f4e8]">{source.name}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#f2efe7]/38">{source.license}</p>
                    </div>
                    <p className="text-sm leading-6 text-[#f2efe7]/58">{source.use}</p>
                    <span className="flex items-start justify-end gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#d8a24a]">
                      {source.status}
                      <ArrowUpRight className="size-3 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </a>
                ))}
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <LicenseBlock
                title="CC0"
                tone="Preferred"
                body="Best fit for assets that may live in the repository. It allows use, modification, redistribution, and commercial use without required attribution, while still avoiding protected logos or recognizable third-party IP."
              />
              <LicenseBlock
                title="Pixabay License"
                tone="Conditional"
                body="Acceptable for integrated portfolio visuals when quality is clearly better than CC0 alternatives. Do not redistribute the asset as a standalone pack, and avoid assets with brands, people, or implied endorsement."
              />
            </section>

            <section className="rounded-lg border border-[#f2efe7]/12 bg-[#151b18] p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#d8a24a]">Target Assets</h2>
              <div className="mt-5 space-y-4">
                {BUNDLED_ASSET_TARGETS.map((asset) => (
                  <a
                    key={asset.name}
                    href={asset.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-[#f2efe7]/10 bg-[#0d1110] p-4 transition hover:border-[#d8a24a]/35"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black uppercase tracking-[0.1em]">{asset.name}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#f2efe7]/38">
                          {asset.source} · {asset.license}
                        </p>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-[#d8a24a]" />
                    </div>
                    <p className="mt-4 break-all rounded-md bg-[#f2efe7]/5 px-3 py-2 text-xs font-bold text-[#f2efe7]/55">
                      {asset.targetPath}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#f2efe7]/55">{asset.notes}</p>
                  </a>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#f2efe7]/12 bg-[#0d1110] p-5">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-[#d8a24a]">Intake Checklist</h2>
              <ul className="mt-5 space-y-3">
                {ASSET_POLICY.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-[#f2efe7]/62">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#d8a24a]" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[#f2efe7]/10 bg-[#f2efe7]/[0.03] p-4">
      <span className="flex size-9 items-center justify-center rounded-md bg-[#d8a24a]/12 text-[#d8a24a]">{icon}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f2efe7]/35">{label}</p>
        <p className="mt-1 text-sm font-black uppercase tracking-[0.08em]">{value}</p>
      </div>
    </div>
  );
}

function LicenseBlock({ title, tone, body }: { title: string; tone: string; body: string }) {
  return (
    <article className="rounded-lg border border-[#f2efe7]/12 bg-[#151b18] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d8a24a]">{tone}</p>
      <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-[#f2efe7]/58">{body}</p>
    </article>
  );
}
