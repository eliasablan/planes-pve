import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function DocumentationShell({ title, intro, page, sections, children }: {
  title: string; intro: string; page: "guide" | "assets";
  sections: readonly { id: string; label: string }[]; children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#080b10] text-[#eef2f6]" style={{ fontFamily: "var(--font-geist-sans), sans-serif", letterSpacing: "normal" }}>
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/15 pb-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-[#f4c95d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4c95d]"><ArrowLeft className="size-4" /> Start screen</Link>
          <nav aria-label="Documentation" className="flex gap-6 text-sm font-semibold">
            <Link href="/docs" aria-current={page === "guide" ? "page" : undefined} className="py-1 text-white/65 hover:text-white aria-[current=page]:text-[#f4c95d]">How to play</Link>
            <Link href="/docs/assets" aria-current={page === "assets" ? "page" : undefined} className="py-1 text-white/65 hover:text-white aria-[current=page]:text-[#f4c95d]">Asset record</Link>
          </nav>
        </header>
        <div className="grid gap-10 py-10 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-16 lg:py-14">
          <aside>
            <nav aria-label="On this page" className="flex flex-wrap gap-x-6 gap-y-3 text-sm lg:sticky lg:top-8 lg:flex-col lg:gap-4">
              <p className="w-full font-semibold text-white/90">On this page</p>
              {sections.map(({ id, label }) => <a key={id} href={`#${id}`} className="text-white/65 hover:text-[#f4c95d]">{label}</a>)}
            </nav>
          </aside>
          <article className="min-w-0 space-y-12 pb-10">
            <header><h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">{title}</h1><p className="mt-5 max-w-[68ch] text-lg leading-8 text-[#b7c2cf]">{intro}</p></header>
            {children}
          </article>
        </div>
      </div>
    </main>
  );
}

export function GuideSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-white/15 pt-7">
      <h2 className="mb-5 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <div className="space-y-4 text-base leading-7 text-[#b7c2cf] [&_strong]:font-semibold [&_strong]:text-[#eef2f6] [&_p]:max-w-[72ch] [&_li]:max-w-[72ch] [&_a]:text-[#f4c95d] [&_a]:underline [&_a]:underline-offset-4">{children}</div>
    </section>
  );
}

export function GuideTable({ label, headers, rows }: { label: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border border-white/15">
      <table className="w-full text-left text-sm leading-6">
        <caption className="sr-only">{label}</caption>
        <thead className="bg-white/[0.06] text-white"><tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/10">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4 align-top first:font-semibold first:text-white">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
