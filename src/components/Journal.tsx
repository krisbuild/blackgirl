"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { BAND_LABEL, bandOf } from "@/lib/insights";
import { countOf, deleteScan, listScans, photoUrls, readNote, scoreOf, weeksSince, type Scan } from "@/lib/journal";
import { markAgeMonths, ONSETS, type Onset } from "@/lib/plan";

type Metric = { id: string; label: string; get: (s: Scan) => number | undefined; lowerIsBetter: boolean; unit: string; noun: string };

/** Counts come from YouCam's masks and are the truest fading signal; scores are kept alongside. */
const METRICS: Metric[] = [
  { id: "dm_count", label: "Dark marks", get: (s) => countOf(s, "age_spot"), lowerIsBetter: true, unit: "", noun: "dark mark" },
  { id: "acne_count", label: "Acne", get: (s) => countOf(s, "acne"), lowerIsBetter: true, unit: "", noun: "acne spot" },
  { id: "age_spot", label: "Dark-mark score", get: (s) => scoreOf(s, "age_spot"), lowerIsBetter: false, unit: " points", noun: "dark-mark score" },
  { id: "texture", label: "Texture", get: (s) => scoreOf(s, "texture"), lowerIsBetter: false, unit: " points", noun: "texture score" },
  { id: "dark_circle_v2", label: "Undereyes", get: (s) => scoreOf(s, "dark_circle_v2"), lowerIsBetter: false, unit: " points", noun: "undereye score" },
];

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export function Journal({ onNewScan, onHome, onProduct }: { onNewScan: () => void; onHome: () => void; onProduct?: () => void }) {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [metricId, setMetricId] = useState("dm_count");

  const load = useCallback(() => {
    listScans()
      .then(async (s) => {
        setScans(s);
        const paths = s.map((x) => x.photo_path).filter((p): p is string => !!p);
        setUrls(await photoUrls(paths));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (s: Scan) => {
    if (!confirm("Delete this scan and its photo? This can't be undone.")) return;
    try {
      await deleteScan(s);
      setScans((prev) => prev?.filter((x) => x.id !== s.id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const first = scans?.[0];
  const latest = scans?.[scans.length - 1];
  // Only offer metrics that have data (older scans may predate mark counting).
  const metrics = METRICS.filter((m) => scans?.some((s) => m.get(s) != null));
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0] ?? METRICS[2];

  return (
    <section className="mx-auto max-w-md px-5 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={onHome} className="text-sm text-muted">
          ← Home
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-honey">Private journal</span>
      </div>
      <h2 className="mt-3 font-display text-[2rem] leading-tight">
        Your <em className="text-sun">glow</em> journal
      </h2>

      {error && <p className="mt-4 rounded-xl bg-terracotta/15 p-3 text-sm text-[#f0a383]">{error}</p>}

      {!scans && !error && (
        <div className="mt-10 flex justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-honey/30 border-t-honey" />
        </div>
      )}

      {scans && scans.length === 0 && (
        <div className="mt-8 rounded-2xl bg-cocoa/70 p-6 text-center ring-1 ring-mahogany">
          <p className="font-display text-xl">No scans yet</p>
          <p className="mt-2 text-sm text-muted">Your first scan starts your story. Scan weekly to watch your dark marks fade.</p>
        </div>
      )}

      {scans && scans.length > 0 && latest && (
        <>
          <MarkTracker scans={scans} />

          {/* progress */}
          <div className="mt-5 rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
            <div className="flex gap-1.5 overflow-x-auto">
              {metrics.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetricId(m.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                    metric.id === m.id ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <TrendChart scans={scans} metric={metric} />
            <ChangeSummary scans={scans} metric={metric} />
          </div>

          {scans.length < 2 && <DemoProgress />}

          {/* before / after */}
          {first && latest && first.id !== latest.id && first.photo_path && latest.photo_path && urls[first.photo_path] && urls[latest.photo_path] && (
            <div className="mt-5">
              <h3 className="font-display text-xl">
                Then <em className="text-sun">&amp;</em> now
              </h3>
              <p className="text-xs text-muted">
                {fmt(first.created_at)} → {fmt(latest.created_at)}. Drag to compare.
              </p>
              <CompareSlider before={urls[first.photo_path]} after={urls[latest.photo_path]} />
            </div>
          )}

          {/* history */}
          <h3 className="mt-8 font-display text-xl">All scans</h3>
          <ul className="mt-3 space-y-2.5">
            {[...scans].reverse().map((s) => {
              const dm = scoreOf(s, "age_spot");
              const dmCount = countOf(s, "age_spot");
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-cocoa/70 p-2.5 ring-1 ring-mahogany">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-mahogany">
                    {s.photo_path && urls[s.photo_path] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urls[s.photo_path]} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-shea">{fmt(s.created_at)}</p>
                    {dmCount != null ? (
                      <p className="text-xs text-muted">
                        {dmCount} dark mark{dmCount === 1 ? "" : "s"}
                        {countOf(s, "acne") != null ? ` · ${countOf(s, "acne")} acne` : ""}
                      </p>
                    ) : (
                      dm != null && (
                        <p className="text-xs text-muted">
                          Dark marks: {BAND_LABEL[bandOf(dm)]} · {Math.round(dm)}
                        </p>
                      )
                    )}
                    {s.skin_type?.whole && <p className="text-xs text-muted">{s.skin_type.whole} skin</p>}
                  </div>
                  <button onClick={() => remove(s)} className="rounded-full px-3 py-1.5 text-xs text-muted ring-1 ring-mahogany hover:text-[#f0a383]">
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <button onClick={onNewScan} className="mt-8 w-full rounded-full bg-gradient-to-r from-honey to-sun py-4 text-lg font-semibold text-espresso">
        {scans?.length ? "Scan this week" : "Take my first scan"}
      </button>
      {onProduct && (
        <button onClick={onProduct} className="mt-3 w-full rounded-full py-3.5 font-semibold text-sand ring-1 ring-mahogany">
          Check a skincare product
        </button>
      )}
      <p className="mt-3 text-center text-[11px] text-muted">Photos are private to you. Delete any scan whenever you like.</p>
    </section>
  );
}

function TrendChart({ scans, metric }: { scans: Scan[]; metric: Metric }) {
  const pts = scans.map((s) => ({ d: s.created_at, v: metric.get(s) })).filter((p): p is { d: string; v: number } => p.v != null);
  const W = 300, H = 140, padX = 18, padY = 16;
  if (pts.length === 0) return <p className="mt-6 text-center text-sm text-muted">No readings yet.</p>;
  const lo = Math.max(0, Math.min(...pts.map((p) => p.v)) - 10);
  const top = Math.max(...pts.map((p) => p.v)) + 10;
  const hi = metric.unit ? Math.min(100, top) : top; // scores cap at 100; counts can go higher
  const x = (i: number) => (pts.length === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (pts.length - 1));
  const y = (v: number) => H - padY - ((v - lo) / Math.max(1, hi - lo)) * (H - padY * 2);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${metric.label} over time`}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={padX} x2={W - padX} y1={padY + f * (H - padY * 2)} y2={padY + f * (H - padY * 2)} stroke="#4a2618" strokeDasharray="3 4" />
      ))}
      {pts.length > 1 && <path d={`${d}L${x(pts.length - 1)},${H - padY}L${x(0)},${H - padY}Z`} fill="#f6c453" opacity="0.12" />}
      {pts.length > 1 && <path d={d} fill="none" stroke="#f6c453" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <g key={p.d}>
          <circle cx={x(i)} cy={y(p.v)} r="4" fill="#2a1710" stroke="#f6c453" strokeWidth="2" />
          {(i === 0 || i === pts.length - 1) && (
            <text x={x(i)} y={y(p.v) - 9} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fbf1e3">
              {Math.round(p.v)}
            </text>
          )}
        </g>
      ))}
      <text x={padX} y={H - 2} fontSize="9" fill="#c9ae95">{fmt(pts[0].d)}</text>
      {pts.length > 1 && (
        <text x={W - padX} y={H - 2} fontSize="9" fill="#c9ae95" textAnchor="end">{fmt(pts[pts.length - 1].d)}</text>
      )}
    </svg>
  );
}

function ChangeSummary({ scans, metric }: { scans: Scan[]; metric: Metric }) {
  const vals = scans.map(metric.get).filter((v): v is number => v != null);
  if (vals.length < 2)
    return <p className="mt-2 text-xs text-muted">One scan so far. Come back next week to start seeing your {metric.label.toLowerCase()} trend.</p>;
  const raw = vals[vals.length - 1] - vals[0];
  const better = metric.lowerIsBetter ? -raw : raw;
  const n = Math.abs(Math.round(raw));
  const plural = n === 1 ? "" : "s";
  const msg =
    better >= (metric.lowerIsBetter ? 1 : 3)
      ? metric.lowerIsBetter
        ? `${n} fewer ${metric.noun}${plural} than your first scan. That's real progress.`
        : `Your ${metric.noun} is ${n}${metric.unit} clearer than your first scan. That's real progress.`
      : better <= -(metric.lowerIsBetter ? 1 : 3)
        ? metric.lowerIsBetter
          ? `${n} more ${metric.noun}${plural} than your first scan. New breakouts and lighting can do this; keep going.`
          : `Your ${metric.noun} is ${n}${metric.unit} lower than your first scan. Lighting and breakouts can swing this; keep going.`
        : "Holding steady. Fading takes months, so consistency is the win.";
  return <p className="mt-2 text-xs leading-relaxed text-sand">{msg}</p>;
}

function CompareSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <div className="relative mt-3 select-none overflow-hidden rounded-[1.5rem] ring-1 ring-mahogany" style={{ aspectRatio: "3 / 4" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Latest scan" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="First scan" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-sun" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sun text-espresso shadow-lg">
          ⇆
        </span>
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-shea">Then</span>
      <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-shea">Now</span>
      <label htmlFor={id} className="sr-only">
        Compare first and latest scan
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

function MarkTracker({ scans }: { scans: Scan[] }) {
  const weeks = weeksSince(scans[0]?.created_at);
  // The earliest answer the user gave about when their marks appeared.
  const answered = scans.map((s) => ({ s, o: readNote(s).markOnset as Onset | undefined })).find((x) => x.o);
  const onsetLabel = answered ? ONSETS.find((o) => o.id === answered.o)?.label : undefined;
  const age = answered ? markAgeMonths(answered.o, weeksSince(answered.s.created_at)) : null;
  const fc = countOf(scans[0], "age_spot"), lc = countOf(scans[scans.length - 1], "age_spot");
  const byCount = fc != null && lc != null;
  const first = byCount ? fc : scoreOf(scans[0], "age_spot");
  const last = byCount ? lc : scoreOf(scans[scans.length - 1], "age_spot");
  return (
    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-2xl bg-cocoa/80 p-3 ring-1 ring-mahogany">
        <p className="font-display text-2xl text-sun">{weeks}</p>
        <p className="text-[10px] leading-tight text-muted">week{weeks === 1 ? "" : "s"} tracked</p>
      </div>
      <div className="rounded-2xl bg-cocoa/80 p-3 ring-1 ring-mahogany">
        <p className="font-display text-2xl text-sun">{age == null ? "?" : age < 1 ? "<1" : Math.round(age)}</p>
        <p className="text-[10px] leading-tight text-muted">{onsetLabel ? "months old (est.)" : "mark age: answer after a scan"}</p>
      </div>
      <div className="rounded-2xl bg-cocoa/80 p-3 ring-1 ring-mahogany">
        <p className="font-display text-2xl text-sun">
          {first != null && last != null && scans.length > 1 ? `${last - first >= 0 ? "+" : ""}${Math.round(last - first)}` : "—"}
        </p>
        <p className="text-[10px] leading-tight text-muted">{byCount ? "dark marks since first scan" : "dark-mark score change"}</p>
      </div>
    </div>
  );
}

/** Shown until there are two real scans. Clearly labelled: these numbers are not the user's. */
const DEMO_COUNTS = [24, 23, 20, 18, 16, 13];

function DemoProgress() {
  const start = new Date("2026-01-05T12:00:00Z").getTime();
  const demo: Scan[] = DEMO_COUNTS.map((n, i) => ({
    id: `demo-${i}`,
    created_at: new Date(start + i * 14 * 864e5).toISOString(),
    photo_path: null,
    concerns: [{ concern: "age_spot", rawScore: 0, uiScore: 0, count: n }],
    overall: null,
    skin_age: null,
    skin_type: null,
    note: null,
  }));
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-honey/50 bg-cocoa/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg text-shea">What tracking looks like</p>
        <span className="shrink-0 rounded-full bg-honey/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-honey">Demo data</span>
      </div>
      <p className="mt-1 text-xs text-muted">Example only, not your results. Your own chart fills in from your second scan.</p>
      <TrendChart scans={demo} metric={METRICS[0]} />
      <p className="mt-2 text-xs leading-relaxed text-sand">
        In this example, {DEMO_COUNTS[0] - DEMO_COUNTS[DEMO_COUNTS.length - 1]} fewer dark marks after 10 weeks of daily sunscreen
        and a fading routine. Real progress is often slower, and lighting can make one week look worse.
      </p>
    </div>
  );
}
