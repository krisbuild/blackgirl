"use client";

import { useState } from "react";
import { VERDICT_LABEL, type SkinProfile, type Verdict } from "@/lib/ingredients";
import type { CheckedItem, RoutineFinding, Slot } from "@/lib/routine";

type Row = { name: string; when: Slot; ingredients: string; paste: boolean };
const EMPTY: Row = { name: "", when: "AM & PM", ingredients: "", paste: false };

const FINDING_STYLE: Record<RoutineFinding["level"], string> = {
  stop: "bg-terracotta/20 text-[#f0a383] ring-terracotta/50",
  warn: "bg-honey/10 text-honey ring-honey/40",
  tip: "bg-mahogany/40 text-sand ring-mahogany",
  good: "bg-good/10 text-good ring-good/30",
};
const FINDING_ICON = { stop: "⛔", warn: "⚠️", tip: "💡", good: "✓" } as const;
const VERDICT_TEXT: Record<Verdict, string> = { great: "text-good", good: "text-good", okay: "text-sun", caution: "text-honey", avoid: "text-[#f0a383]" };

/** "My routine": the user's own products, checked one by one and together. */
export function RoutineCheck({ profile }: { profile?: SkinProfile }) {
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY, when: "AM" }, { ...EMPTY, when: "PM" }]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ items: CheckedItem[]; findings: RoutineFinding[]; notFound: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((r) => ({ name: r.name, when: r.when, ingredients: r.paste ? r.ingredients : undefined })),
          profile: profile ?? { darkMarks: true, acne: true },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't check your routine.");
      setResult(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-xl bg-cocoa/80 px-3 py-2.5 text-sm text-shea ring-1 ring-mahogany placeholder:text-muted/60 focus:outline-none focus:ring-honey";

  return (
    <div className="mt-5">
      <p className="text-sm text-sand">List what you use now. We&apos;ll check each product&apos;s ingredients and how they work together.</p>

      <ul className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <li key={i} className="rounded-2xl bg-cocoa/60 p-3 ring-1 ring-mahogany">
            <div className="flex gap-2">
              <input value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="e.g. La Roche-Posay Anthelios UVMune 400" className={field} />
              <button onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))} aria-label="Remove" className="shrink-0 px-2 text-muted">
                ✕
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {(["AM", "PM", "AM & PM"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => set(i, { when: w })}
                  aria-pressed={r.when === w}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${r.when === w ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"}`}
                >
                  {w === "AM" ? "Morning" : w === "PM" ? "Night" : "Both"}
                </button>
              ))}
              <button onClick={() => set(i, { paste: !r.paste })} className="ml-auto text-[11px] text-honey underline-offset-2 hover:underline">
                {r.paste ? "Look it up instead" : "Paste ingredients"}
              </button>
            </div>
            {r.paste && (
              <textarea
                value={r.ingredients}
                onChange={(e) => set(i, { ingredients: e.target.value })}
                rows={3}
                placeholder="Aqua, Glycerin, Niacinamide…"
                className={`mt-2 ${field}`}
              />
            )}
          </li>
        ))}
      </ul>
      <button onClick={() => setRows((rs) => [...rs, { ...EMPTY }])} className="mt-3 text-sm font-semibold text-honey">
        + Add a product
      </button>

      <button
        onClick={run}
        disabled={busy || !rows.some((r) => r.name.trim() || r.ingredients.trim())}
        className="mt-4 w-full rounded-full bg-gradient-to-r from-honey to-sun py-3.5 font-semibold text-espresso disabled:opacity-50"
      >
        {busy ? "Checking your routine…" : "Check my routine"}
      </button>
      {error && <p className="mt-3 rounded-xl bg-terracotta/15 p-3 text-sm text-[#f0a383]">{error}</p>}

      {result && (
        <div className="mt-6 space-y-3" aria-live="polite">
          <h3 className="font-display text-xl">Your routine</h3>
          <ul className="space-y-2">
            {result.findings.map((f) => (
              <li key={f.text} className={`rounded-xl p-3 text-xs leading-relaxed ring-1 ${FINDING_STYLE[f.level]}`}>
                <span className="mr-1">{FINDING_ICON[f.level]}</span>
                {f.text}
              </li>
            ))}
          </ul>

          <h3 className="pt-2 font-display text-xl">Each product</h3>
          <ul className="space-y-2">
            {result.items.map((it) => (
              <li key={it.name} className="rounded-2xl bg-cocoa/70 p-3 ring-1 ring-mahogany">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-shea">{it.name}</p>
                  <span className={`shrink-0 text-[11px] font-semibold ${VERDICT_TEXT[it.report.verdict]}`}>{VERDICT_LABEL[it.report.verdict]}</span>
                </div>
                <p className="mt-1 text-xs text-sand">{it.report.headline}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {it.source === "pasted" ? "Ingredients you pasted" : `Matched: ${it.matched}`} · {it.when === "AM" ? "morning" : it.when === "PM" ? "night" : "morning & night"}
                </p>
              </li>
            ))}
          </ul>
          {result.notFound.length > 0 && (
            <p className="rounded-xl bg-mahogany/40 p-3 text-xs text-sand">
              We couldn&apos;t find {result.notFound.join(", ")}. Check the spelling, or tap &quot;Paste ingredients&quot; and copy them from the pack.
            </p>
          )}
          <p className="text-[11px] text-muted">Check the matched name is your product. Formulas change, so if in doubt, paste the ingredients from your pack.</p>
        </div>
      )}
    </div>
  );
}
