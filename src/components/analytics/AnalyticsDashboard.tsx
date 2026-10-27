"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, LockKeyhole, LogOut, RefreshCw, Radar } from "lucide-react";
import { analyticsDuration, countryName, type AnalyticsFilters, type AnalyticsIdentity, type AnalyticsRun, type GameAnalytics } from "@/lib/gameAnalytics";
import { ActivityChart, CompletionChart, CountryBars } from "./AnalyticsCharts";
import "./analytics.css";

class AdminError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/${path}`, { ...options, credentials: "same-origin", cache: "no-store", signal: options.signal ?? AbortSignal.timeout(15_000) });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new AdminError(503, "No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new AdminError(response.status, body?.error ?? "No se pudieron cargar las estadísticas.");
  return body as T;
}

const n = (value: number) => value.toLocaleString("es");
const statusNames = { active: "Sin terminar", completed: "Completada", abandoned: "Abandonada" };
const dateTime = (value: string) => new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
const shortId = (value: string) => value.slice(0, 12);
const utcDate = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const initialFilters = (): AnalyticsFilters => ({ from: utcDate(-29), to: utcDate(), country: "", status: "", version: "", q: "" });
const sessionKey = ["admin", "session"] as const;

function Panel({ title, note, children, className = "" }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return <section className={`ac-panel ${className}`}><div className="mb-5"><h2 className="text-xl font-medium text-white">{title}</h2>{note ? <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p> : null}</div>{children}</section>;
}

function IdentityTable({ rows, kind, onSearch }: { rows: AnalyticsIdentity[]; kind: "devices" | "networks" | "names"; onSearch: (q: string) => void }) {
  return rows.length ? <div className="overflow-x-auto"><table className="ac-table">
    <caption className="sr-only">Los 12 {kind === "names" ? "nombres" : kind === "devices" ? "navegadores" : "identificadores de red"} con más partidas en los filtros actuales</caption>
    <thead><tr><th>{kind === "names" ? "Nombre" : "Identificador"}</th><th>Partidas</th><th>Mejor puntuación</th><th>Última partida (UTC)</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.identity}><td><button className="ac-link" title={row.identity} onClick={() => onSearch(kind === "names" ? row.identity : shortId(row.identity))}>{kind === "names" ? row.identity : shortId(row.identity)}</button></td><td>{n(row.runs)}</td><td>{row.bestScore === null ? "—" : n(row.bestScore)}</td><td className="whitespace-nowrap">{dateTime(row.lastPlayed)}</td></tr>)}</tbody>
  </table></div> : <p className="py-6 text-sm leading-6 text-slate-400">No hay identificadores registrados en esta selección. Las partidas anteriores a este cambio pueden tener solo país y nombre.</p>;
}

function RunTable({ runs, onSearch }: { runs: AnalyticsRun[]; onSearch: (q: string) => void }) {
  return <div className="overflow-x-auto"><table className="ac-table whitespace-nowrap">
    <caption className="sr-only">Historial de partidas, de más reciente a más antigua</caption>
    <thead><tr><th>Inicio (UTC)</th><th>Piloto / navegador</th><th>País</th><th>Estado</th><th>Puntos</th><th>Ola</th><th>Bajas</th><th>Tiempo jugado</th><th>Red anónima</th><th>Versión</th></tr></thead>
    <tbody>{runs.map(run => <tr key={run.id}>
      <td title={`ID: ${run.id}${run.finishedAt ? ` · Fin: ${dateTime(run.finishedAt)} UTC` : ""}`}>{dateTime(run.startedAt)}</td>
      <td><div>{run.name ? <button className="ac-link" onClick={() => onSearch(run.name!)}>{run.name}</button> : <span className="text-slate-500">Sin nombre</span>}</div>{run.browserId ? <button title={run.browserId} className="ac-link mt-1 text-xs" onClick={() => onSearch(shortId(run.browserId!))}>{shortId(run.browserId)}</button> : <span className="text-xs text-slate-500">Sin ID de navegador</span>}</td>
      <td>{countryName(run.country)}</td><td><span className={`ac-status ac-status-${run.status}`}>{statusNames[run.status]}</span></td>
      <td>{run.score === null ? "—" : n(run.score)}</td><td>{run.wave ?? "—"}</td><td>{run.kills ?? "—"}</td><td>{analyticsDuration(run.durationMs)}</td>
      <td>{run.networkId ? <button title={run.networkId} className="ac-link text-xs" onClick={() => onSearch(shortId(run.networkId!))}>{shortId(run.networkId)}</button> : <span className="text-slate-500">Sin datos</span>}</td><td className="text-xs">{run.gameVersion}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function AnalyticsDashboard() {
  const client = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [identityKind, setIdentityKind] = useState<"devices" | "networks" | "names">("devices");
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      try { await adminRequest("session", { signal }); return true; }
      catch (error) { if (error instanceof AdminError && error.status === 401) return false; throw error; }
    },
    retry: false, staleTime: 60_000, gcTime: 0,
  });
  const stats = useQuery({
    queryKey: ["admin", "stats", filters, page],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ ...filters, page: String(page) });
      return adminRequest<GameAnalytics>(`stats?${params}`, { signal });
    },
    enabled: session.data === true,
    retry: false, staleTime: 30_000, gcTime: 0,
  });

  function apply(next: AnalyticsFilters) { setDraft(next); setFilters(next); setPage(1); }
  function applyOne(key: keyof AnalyticsFilters, value: string) { apply({ ...filters, [key]: value }); }
  async function login(event: FormEvent) {
    event.preventDefault(); setAuthBusy(true); setAuthError("");
    try {
      await adminRequest("session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      setPassword("");
      await client.cancelQueries({ queryKey: ["admin", "stats"] });
      client.removeQueries({ queryKey: ["admin", "stats"] });
      client.setQueryData(sessionKey, true);
    } catch (error) { setAuthError(error instanceof Error ? error.message : "No se pudo iniciar sesión."); }
    finally { setAuthBusy(false); }
  }
  async function logout() {
    setAuthBusy(true); setAuthError("");
    try {
      await adminRequest("session", { method: "DELETE" });
      await client.cancelQueries({ queryKey: ["admin", "stats"] });
      client.removeQueries({ queryKey: ["admin", "stats"] });
      client.setQueryData(sessionKey, false);
    } catch (error) { setAuthError(error instanceof Error ? error.message : "No se pudo cerrar sesión."); }
    finally { setAuthBusy(false); }
  }

  const expired = stats.error instanceof AdminError && stats.error.status === 401;
  const locked = session.data !== true || expired;
  const data = stats.data;
  const summary = data?.summary;
  const hasData = summary && summary.runs > 0;
  const pageCount = summary ? Math.max(1, Math.ceil(summary.runs / (data?.pageSize ?? 25))) : 1;

  return <main lang="es" className="ac-root min-h-screen bg-black text-slate-200">
    <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-8 lg:px-12 lg:py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-5 border-b border-slate-800 pb-7">
        <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 text-[#9fcfff]"><Radar size={25} aria-hidden="true" /></span><div><h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Control de vuelo</h1><p className="mt-1 text-sm text-slate-400">Skybound Survival · Estadísticas privadas</p></div></div>
        {!locked ? <div className="flex gap-2"><button className="ac-button" disabled={stats.isFetching} onClick={() => { void stats.refetch(); }}><RefreshCw size={14} aria-hidden="true" />{stats.isFetching ? "Actualizando…" : "Actualizar"}</button><button className="ac-button" disabled={authBusy} onClick={() => { void logout(); }}><LogOut size={14} aria-hidden="true" />Salir</button></div> : <span className="flex items-center gap-2 py-2 text-xs text-slate-400"><LockKeyhole size={13} aria-hidden="true" />Acceso restringido</span>}
      </header>

      {locked ? <section className="mx-auto mt-16 max-w-md rounded-lg border border-slate-700 bg-[#0d141c] p-7 sm:mt-24 sm:p-9">
        <LockKeyhole size={25} className="mb-6 text-[#9fcfff]" aria-hidden="true" /><h2 className="text-2xl font-medium">Tu registro de vuelos</h2><p className="mt-3 text-sm leading-6 text-slate-400">Introduce tu clave privada para consultar la actividad del juego.</p>
        {session.isPending ? <p role="status" className="mt-6 text-sm text-slate-300">Comprobando acceso…</p> : <form onSubmit={event => { void login(event); }} className="mt-7 space-y-5">
          <label className="ac-label">Clave de acceso<input name="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={256} className="ac-input mt-2 w-full" /></label>
          <button className="ac-button ac-primary w-full justify-center" disabled={authBusy}>{authBusy ? "Comprobando…" : "Entrar al panel"}<ArrowRight size={15} aria-hidden="true" /></button>
        </form>}
        {expired ? <p role="status" className="mt-5 text-sm text-amber-200">La sesión ha caducado. Vuelve a introducir tu clave.</p> : null}
        {authError || session.error ? <p role="alert" className="mt-5 text-sm leading-6 text-amber-200">{authError || session.error?.message}</p> : null}
      </section> : <>
        <form onSubmit={event => { event.preventDefault(); apply(draft); }} className="ac-panel mb-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="text-sm font-medium text-white">Explorar actividad</h2><div className="flex gap-2">{[{ label: "7 días", days: 7 }, { label: "30 días", days: 30 }, { label: "Todo", days: 0 }].map(preset => <button key={preset.label} type="button" className="ac-preset" onClick={() => apply({ ...filters, from: preset.days ? utcDate(1 - preset.days) : "", to: preset.days ? utcDate() : "" })}>{preset.label}</button>)}</div></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <label className="ac-label">Desde (UTC)<input className="ac-input" type="date" value={draft.from} max={draft.to || undefined} onChange={event => setDraft({ ...draft, from: event.target.value })} /></label>
            <label className="ac-label">Hasta (UTC)<input className="ac-input" type="date" value={draft.to} min={draft.from || undefined} onChange={event => setDraft({ ...draft, to: event.target.value })} /></label>
            <label className="ac-label">País<select className="ac-input" value={draft.country} onChange={event => setDraft({ ...draft, country: event.target.value })}><option value="">Todos los países</option>{(data?.options.countries ?? []).map(country => <option key={country ?? "unknown"} value={country ?? "unknown"}>{countryName(country)}</option>)}</select></label>
            <label className="ac-label">Estado<select className="ac-input" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="">Todos los estados</option>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="ac-label">Versión<select className="ac-input" value={draft.version} onChange={event => setDraft({ ...draft, version: event.target.value })}><option value="">Todas las versiones</option>{(data?.options.versions ?? []).map(version => <option key={version}>{version}</option>)}</select></label>
            <label className="ac-label xl:col-span-2">Nombre o identificador<input className="ac-input" type="search" placeholder="Nombre completo o inicio del ID" value={draft.q} maxLength={64} onChange={event => setDraft({ ...draft, q: event.target.value })} /></label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">El período se aplica a la fecha de inicio. Todas las horas están en UTC.</p><div className="flex gap-3"><button type="button" className="ac-button" onClick={() => apply(initialFilters())}>Restablecer</button><button className="ac-button ac-primary">Aplicar filtros</button></div></div>
        </form>
        {authError ? <p role="alert" className="mb-5 text-sm text-amber-200">{authError}</p> : null}
        {stats.error ? <div role="alert" className="ac-panel mb-6 flex flex-wrap items-center justify-between gap-4 text-sm text-amber-200"><p>{stats.error.message}</p><button className="ac-button" disabled={stats.isFetching} onClick={() => { void stats.refetch(); }}>Reintentar</button></div> : null}
        {stats.isPending ? <div role="status" className="ac-panel py-16 text-center text-slate-400">Consultando el registro de vuelos…</div> : null}
        {data && summary ? <div aria-busy={stats.isFetching}>
          <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-700 bg-slate-700 lg:grid-cols-4">
            {[
              { label: "Partidas registradas", value: n(summary.runs), detail: `${n(summary.unfinished)} sin terminar` },
              { label: "Navegadores únicos", value: n(summary.devices), detail: `${n(summary.trackedRuns)} partidas con ID de navegador` },
              { label: "Redes únicas", value: n(summary.networks), detail: `${n(summary.networkRuns)} partidas con IP anonimizada` },
              { label: "Nombres distintos", value: n(summary.names), detail: `Jugadores desde ${n(summary.countries)} países` },
            ].map(item => <div key={item.label} className="bg-[#0d141c] px-5 py-6 sm:px-6"><p className="text-xs text-slate-400">{item.label}</p><p className="mt-3 text-4xl font-light tabular-nums tracking-tight text-white">{item.value}</p><p className="mt-3 text-xs leading-5 text-slate-400">{item.detail}</p></div>)}
          </div>
          {!hasData ? <section className="ac-panel mb-6 py-14 text-center"><h2 className="text-xl text-white">No hay partidas en esta selección</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">Prueba otro período o elimina filtros. Las partidas aparecerán cuando el juego registre nuevos vuelos.</p><button className="ac-button mx-auto mt-6" onClick={() => apply({ ...initialFilters(), from: "", to: "" })}>Ver todo el historial</button></section> : <>
            <div className="mb-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
              <Panel title="Ritmo de vuelo" note={`Partidas iniciadas por ${data.interval === "day" ? "día" : "mes"}. Pasa el cursor sobre las barras para ver el detalle.`}><ActivityChart data={data.activity} interval={data.interval} from={filters.from} to={filters.to} /></Panel>
              <Panel title="Cómo terminan las partidas" note="Selecciona un estado para filtrar el panel."><CompletionChart summary={summary} onStatus={value => applyOne("status", value)} /><p className="mt-3 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-400">«Sin terminar» significa que no llegó un resultado final. Puede ser un cierre de pestaña o una desconexión; no indica actividad en directo.</p></Panel>
            </div>
            <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.7fr]">
              <Panel title="Desde dónde despegan" note="País aproximado de la conexión. Selecciona un país para filtrar."><CountryBars countries={data.countries} total={summary.runs} onCountry={value => applyOne("country", value)} /><details className="mt-6 text-xs text-slate-400"><summary className="w-fit cursor-pointer hover:text-white">Todos los países ({data.countries.length})</summary><div className="mt-4 overflow-x-auto"><table className="ac-table"><caption className="sr-only">Procedencia de las partidas</caption><thead><tr><th>País</th><th>Partidas</th><th>Navegadores con ID</th></tr></thead><tbody>{data.countries.map(row => <tr key={row.country ?? "unknown"}><td><button className="ac-link" onClick={() => applyOne("country", row.country ?? "unknown")}>{countryName(row.country)}</button></td><td>{n(row.runs)}</td><td>{n(row.devices)}</td></tr>)}</tbody></table></div></details></Panel>
              <Panel title="Quién vuelve a jugar" note="Los 12 con más partidas. Selecciona un nombre o identificador para ver su historial.">
                <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Agrupar jugadores por">{([{ key: "devices", label: "Navegadores" }, { key: "networks", label: "Redes" }, { key: "names", label: "Nombres" }] as const).map(tab => <button key={tab.key} aria-pressed={identityKind === tab.key} className={`ac-button ${identityKind === tab.key ? "ac-selected" : ""}`} onClick={() => setIdentityKind(tab.key)}>{tab.label}</button>)}</div>
                <IdentityTable rows={data.identities[identityKind]} kind={identityKind} onSearch={value => applyOne("q", value)} />
                <p className="mt-5 text-xs leading-5 text-slate-400">Un navegador no equivale a una persona o un equipo físico. Varias personas pueden compartir nombre o red; borrar los datos del navegador genera otro ID.</p>
              </Panel>
            </div>
            <div className="ac-panel mb-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Tiempo total registrado", analyticsDuration(summary.durationMs)], ["Duración media", analyticsDuration(summary.avgDurationMs)],
                ["Puntuación media", summary.avgScore === null ? "—" : n(Math.round(summary.avgScore))], ["Mejor puntuación", summary.bestScore === null ? "—" : n(summary.bestScore)],
                ["Ola media", summary.avgWave === null ? "—" : summary.avgWave.toLocaleString("es", { maximumFractionDigits: 1 })], ["Ola máxima", summary.bestWave === null ? "—" : n(summary.bestWave)],
              ].map(([label, value]) => <div key={label}><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-xl font-medium tabular-nums text-white">{value}</p></div>)}
              <p className="col-span-full text-xs text-slate-500">Los promedios y el tiempo sumado usan las partidas con resultado final, incluidas las abandonadas.</p>
            </div>
            <Panel title="Registro de partidas" note={`${n(summary.runs)} resultados en esta selección. Los guiones indican datos que no se recibieron.`}>
              <RunTable runs={data.runs} onSearch={value => applyOne("q", value)} />
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5 text-xs text-slate-400"><span>Página {n(page)} de {n(pageCount)} · {data.pageSize} partidas por página</span><div className="flex gap-2"><button className="ac-button" disabled={page <= 1 || stats.isFetching} onClick={() => setPage(value => value - 1)}><ArrowLeft size={14} aria-hidden="true" />Anterior</button><button className="ac-button" disabled={page >= pageCount || stats.isFetching} onClick={() => setPage(value => value + 1)}>Siguiente<ArrowRight size={14} aria-hidden="true" /></button></div></div>
            </Panel>
          </>}
          <footer className="mt-7 flex flex-wrap justify-between gap-4 pb-4 text-xs leading-5 text-slate-500"><p className="max-w-3xl">Cobertura de identificación: {summary.runs ? Math.round(summary.trackedRuns / summary.runs * 100) : 0}% por navegador y {summary.runs ? Math.round(summary.networkRuns / summary.runs * 100) : 0}% por red. Los identificadores se recogen desde esta actualización. La ubicación puede variar con una VPN.</p><p>Actualizado: {dateTime(data.generatedAt)} UTC</p></footer>
        </div> : null}
      </>}
    </div>
  </main>;
}
