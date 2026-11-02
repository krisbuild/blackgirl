"use client";

import { useMemo } from "react";
import { weeksSince, type Analysis, type ScanNote } from "@/lib/journal";
import { buildPlan, markAgeMonths, ONSETS, type Onset } from "@/lib/plan";

const score = (a: Analysis, k: string) => a.concerns.find((c) => c.concern === k)?.rawScore;

/** "How long have they been there?" + the personal Dark Mark Plan. */
export function DarkMarkPlan({
  analysis,
  firstScan,
  note,
  onNote,
  noteStatus,
}: {
  analysis: Analysis;
  firstScan?: string | null;
  note: ScanNote;
  onNote: (patch: ScanNote) => void;
  noteStatus?: string | null;
}) {
  const onset = note.markOnset as Onset | undefined;
  const saveNote = noteStatus;
  const trackedWeeks = weeksSince(firstScan);

  const plan = useMemo(
    () =>
      buildPlan({
        darkMarks: score(analysis, "age_spot"),
        acne: score(analysis, "acne"),
        darkMarkCount: analysis.concerns.find((c) => c.concern === "age_spot")?.count,
        acneCount: analysis.concerns.find((c) => c.concern === "acne")?.count,
        texture: score(analysis, "texture"),
        onset,
        trackedWeeks,
        darkMarksFeel: note.feel?.age_spot,
        acneFeel: note.feel?.acne,
        skinType: analysis.skinType,
      }),
    [analysis, onset, trackedWeeks, note.feel],
  );
  const age = markAgeMonths(onset, trackedWeeks);

  const choose = (o: Onset) => onNote({ markOnset: o });

  return (
    <div className="mt-8">
      {/* how long */}
      <div className="rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
        <p className="font-semibold text-shea">How long have these marks been there?</p>
        <p className="mt-1 text-xs text-muted">
          A photo can&apos;t tell a mark&apos;s age, so we ask, and your journal keeps count from here.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ONSETS.map((o) => (
            <button
              key={o.id}
              onClick={() => choose(o.id)}
              aria-pressed={onset === o.id}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                onset === o.id ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {saveNote && <p className="mt-2 text-[11px] text-good">{saveNote}</p>}
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-espresso/60 p-3">
          <span className="font-display text-2xl text-sun">{age == null ? "?" : age < 1 ? "<1" : Math.round(age)}</span>
          <div className="text-xs leading-snug">
            <p className="font-semibold text-shea">{age == null ? "Age unknown" : `month${age >= 1.5 ? "s" : ""} old, roughly`}</p>
            <p className="text-muted">
              {trackedWeeks > 0 ? `Tracking in your journal for ${trackedWeeks} week${trackedWeeks === 1 ? "" : "s"}.` : "Tracking starts with this scan."}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-sand">{plan.ageSummary}</p>
      </div>

      {/* plan */}
      <h3 className="mt-8 font-display text-2xl">
        Your <em className="text-sun">dark mark plan</em>
      </h3>
      <p className="mt-1 text-sm text-sand">{plan.headline}.</p>
      <p className="mt-2 rounded-xl bg-mahogany/40 p-3 text-xs leading-relaxed text-sand">
        <span className="font-semibold text-shea">Realistic timeline: </span>
        {plan.timeline}
      </p>

      <ol className="mt-4 space-y-4">
        {plan.phases.map((ph, n) => (
          <li key={ph.title} className="relative rounded-2xl bg-cocoa/70 p-4 ring-1 ring-mahogany">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-lg text-shea">
                <span className="mr-2 text-sun">{n + 1}</span>
                {ph.title}
              </p>
              <span className="shrink-0 rounded-full bg-honey/15 px-2 py-0.5 text-[10px] font-semibold text-honey">{ph.weeks}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{ph.goal}</p>
            <ul className="mt-3 space-y-2.5">
              {ph.steps.map((st) => (
                <li key={st.name} className="flex gap-3">
                  <span className="mt-0.5 w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-honey">{st.when}</span>
                  <span>
                    <span className="text-sm font-semibold text-shea">{st.name}</span>
                    <span className="block text-xs leading-relaxed text-muted">{st.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-2xl bg-mahogany/40 p-4">
        <p className="text-sm font-semibold text-shea">Ground rules</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-sand">
          {plan.habits.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>

      {plan.dermatologist.show && (
        <div className="mt-4 rounded-2xl bg-terracotta/10 p-4 ring-1 ring-terracotta/40">
          <p className="text-sm font-semibold text-shea">Worth a dermatologist visit</p>
          <p className="mt-1 text-xs leading-relaxed text-sand">{plan.dermatologist.reason}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Ask them about</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-sand">
            {plan.dermatologist.askAbout.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
