"use client";

import { countryName, type AnalyticsBucket, type AnalyticsCountry, type AnalyticsSummary } from "@/lib/gameAnalytics";

export const statusLabels = { completed: "Completadas", abandoned: "Abandonadas", unfinished: "Sin terminar" };
const colors = { completed: "#9fcfff", abandoned: "#e7bd7b", unfinished: "#8c949e" };
const statuses = ["completed", "abandoned", "unfinished"] as const;

export function StatusLegend() {
  return <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
    {statuses.map(status => <li key={status} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: colors[status] }} />{statusLabels[status]}</li>)}
  </ul>;
}

function fillPeriods(data: AnalyticsBucket[], interval: "day" | "month", from: string, to: string) {
  const start = (interval === "day" ? from : "") || data[0]?.period;
  const end = (interval === "day" ? to : "") || data.at(-1)?.period;
  if (!start || !end) return [];
  const date = new Date(`${start.slice(0, interval === "day" ? 10 : 7)}${interval === "month" ? "-01" : ""}T00:00:00Z`);
  const last = interval === "month" ? end.slice(0, 7) : end;
  const points = new Map(data.map(point => [point.period, point]));
  const filled: AnalyticsBucket[] = [];
  // The API selects months for long ranges; keep rendering bounded for unusual date inputs.
  while (filled.length < 1200) {
    const period = date.toISOString().slice(0, interval === "day" ? 10 : 7);
    if (period > last) break;
    filled.push(points.get(period) ?? { period, runs: 0, completed: 0, abandoned: 0, unfinished: 0 });
    if (interval === "day") date.setUTCDate(date.getUTCDate() + 1);
    else date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return filled;
}

export function ActivityChart({ data, interval, from, to }: { data: AnalyticsBucket[]; interval: "day" | "month"; from: string; to: string }) {
  const points = fillPeriods(data, interval, from, to);
  const max = Math.max(2, Math.ceil(Math.max(0, ...points.map(point => point.runs)) / 2) * 2);
  const width = 840;
  const height = 200;
  const left = 35;
  const top = 12;
  const plotHeight = 148;
  const step = (width - left - 8) / Math.max(points.length, 1);
  const barWidth = Math.min(40, step * 0.7);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  return <div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Partidas por ${interval === "day" ? "día" : "mes"}, en UTC`} className="mt-4 w-full overflow-visible">
      <title>Actividad: {data.reduce((total, point) => total + point.runs, 0)} partidas. Cada barra separa completadas, abandonadas y sin terminar.</title>
      {[0, 0.5, 1].map(fraction => <g key={fraction}>
        <line x1={left} x2={width} y1={top + plotHeight * (1 - fraction)} y2={top + plotHeight * (1 - fraction)} stroke="#27313c" strokeDasharray={fraction ? "3 5" : undefined} />
        <text x={left - 10} y={top + plotHeight * (1 - fraction) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{Math.round(max * fraction)}</text>
      </g>)}
      {points.map((point, index) => {
        let accumulated = 0;
        return <g key={point.period}>
          <title>{point.period}: {point.runs} partidas, {point.completed} completadas, {point.abandoned} abandonadas, {point.unfinished} sin terminar</title>
          {statuses.map(status => {
            const h = point[status] / max * plotHeight;
            accumulated += h;
            return <rect key={status} x={left + index * step + (step - barWidth) / 2} y={top + plotHeight - accumulated} width={barWidth} height={h} fill={colors[status]} />;
          })}
          {index % labelEvery === 0 || index === points.length - 1 ? <text x={left + index * step + step / 2} y={height - 14} textAnchor="middle" fill="#94a3b8" fontSize="11">{interval === "day" ? point.period.slice(5).split("-").reverse().join("/") : point.period}</text> : null}
        </g>;
      })}
    </svg>
    <StatusLegend />
    <details className="mt-4 text-xs text-slate-400"><summary className="w-fit cursor-pointer hover:text-white">Ver datos del gráfico</summary>
      <div className="mt-3 max-h-48 overflow-auto"><table className="ac-table"><caption className="sr-only">Partidas por período, UTC</caption><thead><tr><th>Período</th><th>Completadas</th><th>Abandonadas</th><th>Sin terminar</th><th>Total</th></tr></thead><tbody>{points.map(point => <tr key={point.period}><td>{point.period}</td><td>{point.completed}</td><td>{point.abandoned}</td><td>{point.unfinished}</td><td>{point.runs}</td></tr>)}</tbody></table></div>
    </details>
  </div>;
}

export function CompletionChart({ summary, onStatus }: { summary: AnalyticsSummary; onStatus: (status: string) => void }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const total = summary.runs;
  return <div className="flex flex-wrap items-center justify-center gap-6 py-4">
    <svg viewBox="0 0 150 150" className="w-40 shrink-0" role="img" aria-label={`${summary.completed} completadas, ${summary.abandoned} abandonadas y ${summary.unfinished} sin terminar`}>
      <circle cx="75" cy="75" r={radius} fill="none" stroke="#27313c" strokeWidth="12" />
      {statuses.map((status, index) => {
        const length = total ? summary[status] / total * circumference : 0;
        const start = total ? statuses.slice(0, index).reduce((sum, previous) => sum + summary[previous], 0) / total * circumference : 0;
        return <circle key={status} cx="75" cy="75" r={radius} fill="none" stroke={colors[status]} strokeWidth="12" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-start} transform="rotate(-90 75 75)" />;
      })}
      <text x="75" y="76" textAnchor="middle" fill="#f2f2f0" fontSize="28">{total ? Math.round(summary.completed / total * 100) : 0}%</text>
      <text x="75" y="96" textAnchor="middle" fill="#94a3b8" fontSize="10">completadas</text>
    </svg>
    <div className="min-w-40 flex-1 space-y-1">{statuses.map(status => <button key={status} type="button" onClick={() => onStatus(status === "unfinished" ? "active" : status)} className="flex w-full items-center justify-between gap-4 rounded px-2 py-2 text-sm hover:bg-white/5">
      <span className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: colors[status] }} />{statusLabels[status]}</span><strong className="font-medium tabular-nums text-white">{summary[status].toLocaleString("es")}</strong>
    </button>)}</div>
  </div>;
}

export function CountryBars({ countries, total, onCountry }: { countries: AnalyticsCountry[]; total: number; onCountry: (country: string) => void }) {
  const maximum = Math.max(1, ...countries.map(country => country.runs));
  return <div className="space-y-4">{countries.slice(0, 6).map(row => <button type="button" key={row.country ?? "unknown"} onClick={() => onCountry(row.country ?? "unknown")} className="group block w-full rounded text-left" aria-label={`Filtrar por ${countryName(row.country)}`}>
    <div className="mb-2 flex justify-between gap-3 text-sm"><span className="text-slate-200 group-hover:text-sky-200">{countryName(row.country)}</span><span className="tabular-nums text-slate-400"><strong className="font-medium text-white">{row.runs.toLocaleString("es")}</strong><span className="ml-3">{total ? (row.runs / total * 100).toFixed(1) : 0}%</span></span></div>
    <div className="h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-[#9fcfff] transition-[width] motion-reduce:transition-none" style={{ width: `${row.runs / maximum * 100}%` }} /></div>
  </button>)}</div>;
}
