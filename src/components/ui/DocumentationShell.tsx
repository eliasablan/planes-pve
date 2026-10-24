import { SiteNav } from "./SiteNav";
import type { ReactNode } from "react";

export function DocumentationShell({ title, intro, page, sections, children }: {
  title: string; intro: string; page: "guide" | "assets";
  sections: readonly { id: string; label: string }[]; children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-black text-wf-ink">
      <div className="mx-auto max-w-[1440px] p-4 sm:p-6">
        <SiteNav current={page === "guide" ? "/docs" : "/docs/assets"} />
        <div className="grid gap-10 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:py-14">
          <aside>
            <nav aria-label="On this page" className="wf-frame flex flex-wrap gap-x-6 gap-y-3 p-4 text-sm lg:sticky lg:top-6 lg:flex-col lg:gap-3">
              <p className="w-full text-[11px] font-medium text-wf-dim">ON_THIS_PAGE</p>
              {sections.map(({ id, label }) => <a key={id} href={`#${id}`} className="text-wf-dim hover:text-wf-ink">{label}</a>)}
            </nav>
          </aside>
          <article className="min-w-0 space-y-12 pb-10">
            <header><h1 className="text-5xl font-light leading-none sm:text-7xl">{title}</h1><p className="mt-5 max-w-[68ch] text-lg leading-8 text-wf-dim">{intro}</p></header>
            {children}
          </article>
        </div>
      </div>
    </main>
  );
}

export function GuideSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-wf-hair pt-7">
      <h2 className="mb-5 text-2xl font-normal sm:text-3xl">{title}</h2>
      <div className="space-y-4 text-base leading-7 text-wf-dim [&_strong]:font-semibold [&_strong]:text-wf-ink [&_p]:max-w-[72ch] [&_li]:max-w-[72ch] [&_a]:text-wf-ink [&_a]:underline [&_a]:underline-offset-4">{children}</div>
    </section>
  );
}

export function GuideTable({ label, headers, rows }: { label: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="wf-frame overflow-x-auto">
      <table className="w-full text-left text-sm leading-6">
        <caption className="sr-only">{label}</caption>
        <thead className="border-b border-wf-line text-wf-ink"><tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-4 py-3 text-[11px] font-medium text-wf-dim">{header.toUpperCase().replace(/\s+/g, "_")}</th>)}</tr></thead>
        <tbody className="divide-y divide-wf-hair">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4 align-top first:font-medium first:text-wf-ink">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
