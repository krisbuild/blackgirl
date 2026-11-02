"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { BAND_LABEL, bandOf, CONCERNS } from "@/lib/insights";
import { deleteScan, listScans, photoUrls, scoreOf, type Scan } from "@/lib/journal";

const TRACKED = ["age_spot", "acne", "texture", "dark_circle_v2"] as const;

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export function Journal({ onNewScan, onHome }: { onNewScan: () => void; onHome: () => void }) {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<(typeof TRACKED)[number]>("age_spot");

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
          {/* progress */}
          <div className="mt-5 rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
            <div className="flex gap-1.5 overflow-x-auto">
              {TRACKED.map((k) => (
                <button
                  key={k}
                  onClick={() => setMetric(k)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                    metric === k ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"
                  }`}
                >
                  {CONCERNS[k].label}
                </button>
              ))}
            </div>
            <TrendChart scans={scans} metric={metric} />
            <ChangeSummary scans={scans} metric={metric} />
          </div>

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
                    {dm != null && (
                      <p className="text-xs text-muted">
                        Dark marks: {BAND_LABEL[bandOf(dm)]} · {Math.round(dm)}
                      </p>
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
      <p className="mt-3 text-center text-[11px] text-muted">Photos are private to you. Delete any scan whenever you like.</p>
    </section>
  );
}

function TrendChart({ scans, metric }: { scans: Scan[]; metric: string }) {
  const pts = scans.map((s) => ({ d: s.created_at, v: scoreOf(s, metric) })).filter((p): p is { d: string; v: number } => p.v != null);
  const W = 300, H = 140, padX = 18, padY = 16;
  if (pts.length === 0) return <p className="mt-6 text-center text-sm text-muted">No readings yet.</p>;
  const lo = Math.max(0, Math.min(...pts.map((p) => p.v)) - 10);
  const hi = Math.min(100, Math.max(...pts.map((p) => p.v)) + 10);
  const x = (i: number) => (pts.length === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (pts.length - 1));
  const y = (v: number) => H - padY - ((v - lo) / Math.max(1, hi - lo)) * (H - padY * 2);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${CONCERNS[metric].label} over time`}>
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

function ChangeSummary({ scans, metric }: { scans: Scan[]; metric: string }) {
  const vals = scans.map((s) => scoreOf(s, metric)).filter((v): v is number => v != null);
  const label = CONCERNS[metric].label.toLowerCase();
  if (vals.length < 2)
    return <p className="mt-2 text-xs text-muted">One scan so far. Come back next week to start seeing your {label} trend.</p>;
  const delta = vals[vals.length - 1] - vals[0];
  const msg =
    delta >= 3
      ? `Your ${label} reading is ${Math.round(delta)} points clearer than your first scan. That's real progress.`
      : delta <= -3
        ? `Your ${label} reading is ${Math.round(-delta)} points lower than your first scan. Lighting and breakouts can swing this; keep going.`
        : `Your ${label} reading is holding steady. Fading takes months, so consistency is the win.`;
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
