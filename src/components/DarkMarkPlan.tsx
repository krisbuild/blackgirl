"use client";

import { useEffect, useState } from "react";
import { WARNING_SIGNS, type Assessment, type AssessmentInput, type WarningSign } from "@/lib/assessment";
import { BAND_LABEL, type Band } from "@/lib/insights";
import { weeksSince, type Analysis, type ScanNote } from "@/lib/journal";
import { markAgeMonths, ONSETS, type Onset } from "@/lib/plan";

const BAND_DOT: Record<Band, string> = { clear: "bg-good", mild: "bg-sun", moderate: "bg-honey", noticeable: "bg-terracotta" };

/**
 * The assessment section of the results: questions (mark age, safety), then the server's
 * assessment: what was measured and how, the plan, verified products.
 */
export function DarkMarkPlan({
  analysis,
  firstScan,
  note,
  onNote,
  noteStatus,
  onCheckProduct,
}: {
  analysis: Analysis;
  firstScan?: string | null;
  note: ScanNote;
  onNote: (patch: ScanNote) => void;
  noteStatus?: string | null;
  onCheckProduct?: () => void;
}) {
  const onset = note.markOnset as Onset | undefined;
  const trackedWeeks = weeksSince(firstScan);
  const age = markAgeMonths(onset, trackedWeeks);
  const [result, setResult] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ask the server for the assessment whenever the scan or the answers change.
  const answersKey = JSON.stringify(note);
  useEffect(() => {
    const input: AssessmentInput = {
      concerns: analysis.concerns.map(({ concern, rawScore, count, coveragePct }) => ({ concern, rawScore, count, coveragePct })),
      skinType: analysis.skinType,
      marks: analysis.marks,
      quality: analysis.quality,
      trackedWeeks,
      answers: {
        onset,
        feel: note.feel,
        pregnant: note.pregnant,
        sensitive: note.sensitive,
        warningSigns: note.warningSigns as WarningSign[] | undefined,
        budget: note.budget,
      },
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: ctrl.signal })
        .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error ?? "Assessment failed"))))
        .then((a: Assessment) => {
          setResult(a);
          setError(null);
        })
        .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, answersKey, trackedWeeks]);

  const toggleSign = (id: WarningSign) => {
    const cur = new Set(note.warningSigns ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    onNote({ warningSigns: [...cur] });
  };

  const plan = result?.plan;

  return (
    <div className="mt-8">
      {/* how long */}
      <div className="rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
        <p className="font-semibold text-shea">How long have these marks been there?</p>
        <p className="mt-1 text-xs text-muted">A photo can&apos;t tell a mark&apos;s age, so we ask, and your journal keeps count from here.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ONSETS.map((o) => (
            <Chip key={o.id} on={onset === o.id} onClick={() => onNote({ markOnset: o.id })}>
              {o.label}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-espresso/60 p-3">
          <span className="font-display text-2xl text-sun">{age == null ? "?" : age < 1 ? "<1" : Math.round(age)}</span>
          <div className="text-xs leading-snug">
            <p className="font-semibold text-shea">{age == null ? "Age unknown" : `month${age >= 1.5 ? "s" : ""} old, roughly`}</p>
            <p className="text-muted">
              {trackedWeeks > 0 ? `Tracking in your journal for ${trackedWeeks} week${trackedWeeks === 1 ? "" : "s"}.` : "Tracking starts with this scan."}
            </p>
          </div>
        </div>
        {plan && <p className="mt-3 text-sm leading-relaxed text-sand">{plan.ageSummary}</p>}
      </div>

      {/* safety */}
      <div className="mt-3 rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
        <p className="font-semibold text-shea">A few safety checks</p>
        <p className="mt-1 text-xs text-muted">These change what we suggest.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip on={!!note.pregnant} onClick={() => onNote({ pregnant: !note.pregnant })}>
            Pregnant or breastfeeding
          </Chip>
          <Chip on={!!note.sensitive} onClick={() => onNote({ sensitive: !note.sensitive })}>
            Sensitive skin
          </Chip>
        </div>
        <p className="mt-3 text-xs text-muted">Do you have any of these?</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {WARNING_SIGNS.map((w) => (
            <label key={w.id} className="flex cursor-pointer items-start gap-2 text-xs text-sand">
              <input
                type="checkbox"
                checked={(note.warningSigns ?? []).includes(w.id)}
                onChange={() => toggleSign(w.id)}
                className="mt-0.5 h-4 w-4 accent-[var(--honey)]"
              />
              {w.label}
            </label>
          ))}
        </div>
        {noteStatus && <p className="mt-2 text-[11px] text-good">{noteStatus}</p>}
      </div>

      {error && <p className="mt-4 rounded-xl bg-terracotta/15 p-3 text-sm text-[#f0a383]">Couldn&apos;t load your plan: {error}</p>}
      {!result && !error && (
        <div className="mt-8 flex justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-honey/30 border-t-honey" />
        </div>
      )}

      {result && plan && (
        <>
          {result.dermatologist.urgent && (
            <div className="mt-4 rounded-2xl bg-terracotta/20 p-4 ring-1 ring-terracotta">
              <p className="font-semibold text-shea">Please see a dermatologist first</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-sand">
                {result.dermatologist.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-sand">These need a professional look. The plan below is gentle cosmetic care only.</p>
            </div>
          )}

          {/* what was measured */}
          <h3 className="mt-8 font-display text-2xl">
            What we <em className="text-sun">measured</em>
          </h3>
          <ul className="mt-3 divide-y divide-mahogany rounded-2xl bg-cocoa/70 ring-1 ring-mahogany">
            {result.measurements.map((m) => (
              <li key={m.label} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-shea">{m.label}</p>
                  {m.band && (
                    <span className="flex items-center gap-1.5 text-[11px] text-sand">
                      <span className={`h-2 w-2 rounded-full ${BAND_DOT[m.band]}`} />
                      {BAND_LABEL[m.band]}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-sand">{m.value}</p>
                <p className="mt-0.5 text-[10px] text-muted">{m.method}</p>
              </li>
            ))}
          </ul>

          {/* plan */}
          <h3 className="mt-8 font-display text-2xl">
            Your <em className="text-sun">dark mark plan</em>
          </h3>
          <p className="mt-1 text-sm text-sand">{plan.headline}.</p>
          <p className="mt-2 rounded-xl bg-mahogany/40 p-3 text-xs leading-relaxed text-sand">
            <span className="font-semibold text-shea">Realistic timeline: </span>
            {plan.timeline}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">Budget:</span>
            {(
              [
                [undefined, "Any"],
                ["$", "Budget $"],
                ["$$", "Mid-range $$"],
                ["$$$", "Premium $$$"],
              ] as const
            ).map(([v, l]) => (
              <Chip key={l} on={note.budget === v} onClick={() => onNote({ budget: v })}>
                {l}
              </Chip>
            ))}
          </div>

          <ol className="mt-4 space-y-4">
            {plan.phases.map((ph, n) => (
              <li key={ph.title} className="rounded-2xl bg-cocoa/70 p-4 ring-1 ring-mahogany">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-lg text-shea">
                    <span className="mr-2 text-sun">{n + 1}</span>
                    {ph.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-honey/15 px-2 py-0.5 text-[10px] font-semibold text-honey">{ph.weeks}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{ph.goal}</p>
                <ul className="mt-3 space-y-3">
                  {ph.steps.map((st) => (
                    <li key={st.name} className="flex gap-3">
                      <span className="mt-0.5 w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-honey">{st.when}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-shea">{st.name}</span>
                        </span>
                        <span className="block text-xs leading-relaxed text-muted">{st.note}</span>
                        {st.leftOut.length > 0 && (
                          <span className="mt-1 block text-[10px] leading-snug text-muted">
                            Left out for your skin:{" "}
                            {st.leftOut.map((x) => `${x.brand} ${x.name} (${x.reason})`).join("; ")}
                          </span>
                        )}
                        {st.products.length > 0 && (
                          <span className="mt-1.5 block text-[11px] leading-snug text-sand">
                            <span className="font-semibold text-good">Why these: </span>
                            {st.why}
                          </span>
                        )}
                        {st.products.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {st.products.map((pr) => (
                              <span key={pr.brand + pr.name} title={`Contains: ${pr.matched.join(", ")}`} className="rounded-lg bg-espresso/70 px-2 py-1 text-[11px] leading-tight text-sand ring-1 ring-good/30">
                                <span className="font-semibold text-shea">{pr.brand}</span> {pr.name}
                                {pr.budget && <span className="ml-1 text-[10px] text-honey">{pr.budget}</span>}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <p className="mt-3 text-[11px] leading-relaxed text-muted">{result.productsNote}</p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
            <div>
              <p className="text-sm font-semibold text-shea">Already have a product?</p>
              <p className="text-xs text-muted">Scan its ingredient list to see if it suits your skin.</p>
            </div>
            {onCheckProduct && (
              <button onClick={onCheckProduct} className="shrink-0 rounded-full bg-gradient-to-r from-honey to-sun px-4 py-2 text-sm font-semibold text-espresso">
                Check a product
              </button>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-mahogany/40 p-4">
            <p className="text-sm font-semibold text-shea">Ground rules</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-sand">
              {plan.habits.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>

          {!result.dermatologist.urgent && plan.dermatologist.show && (
            <div className="mt-4 rounded-2xl bg-terracotta/10 p-4 ring-1 ring-terracotta/40">
              <p className="text-sm font-semibold text-shea">Worth a dermatologist visit</p>
              <p className="mt-1 text-xs leading-relaxed text-sand">{plan.dermatologist.reason}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Ask them about</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-sand">
                {plan.dermatologist.askAbout.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}

          <details className="mt-4 rounded-2xl bg-cocoa/60 p-4 ring-1 ring-mahogany">
            <summary className="cursor-pointer text-sm font-semibold text-sand">How Shine reached this</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted">
              {result.method.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </details>
        </>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${on ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"}`}
    >
      {children}
    </button>
  );
}
