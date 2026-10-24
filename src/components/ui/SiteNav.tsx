import Link from "next/link";

const LINKS = [
  { href: "/leaderboard", label: "RANKING" },
  { href: "/docs", label: "HOW_TO_PLAY" },
  { href: "/docs/assets", label: "ASSET_RECORD" },
] as const;

export function SiteNav({ current }: { current?: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Main" className="flex flex-wrap items-stretch gap-2 text-sm">
      <Link href="/" className="wf-frame flex items-center px-4 py-2 font-medium hover:border-wf-ink">
        SKYBOUND_SURVIVAL
      </Link>
      <div className="ml-auto flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current === link.href ? "page" : undefined}
            className="wf-frame px-4 py-2 text-wf-dim hover:border-wf-ink hover:text-wf-ink aria-[current=page]:border-wf-ink aria-[current=page]:text-wf-ink"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
