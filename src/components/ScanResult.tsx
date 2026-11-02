"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { prepareForAnalysis } from "@/lib/image";
import { AVOID, BAND_LABEL, ingredientPicks, insightsFrom, type Band, type Insight } from "@/lib/insights";
import { saveScan, type Analysis } from "@/lib/journal";

type Phase =
  | { kind: "working"; step: "preparing" | "analyzing" | "saving" }
  | { kind: "error"; message: string }
  | { kind: "done"; analysis: Analysis; saved: boolean; saveError?: string };

const STEPS = [
  { key: "preparing", label: "Preparing your photo" },
  { key: "analyzing", label: "YouCam AI is reading your skin" },
  { key: "saving", label: "Saving to your private journal" },
] as const;

const BAND_STYLE: Record<Band, string> = {
  clear: "bg-good/15 text-good",
  mild: "bg-sun/15 text-sun",
  moderate: "bg-honey/20 text-honey",
  noticeable: "bg-terracotta/20 text-[#f0a383]",
};

/** Run the analysis once per photo, save it, and show what it means. */
export function ScanResult({
  photo,
  onRetake,
  onJournal,
}: {
  photo: Blob;
  onRetake: () => void;
  onJournal: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "working", step: "preparing" });
  const [url, setUrl] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      let prepared: Blob;
      try {
        const p = await prepareForAnalysis(photo);
        prepared = p.blob;
        setUrl(URL.createObjectURL(prepared));
      } catch (e) {
        setPhase({ kind: "error", message: (e as Error).message });
        return;
      }

      setPhase({ kind: "working", step: "analyzing" });
      let analysis: Analysis;
      try {
        const form = new FormData();
        form.append("image", prepared, "selfie.jpg");
        const res = await fetch("/api/analyze", { method: "POST", body: form });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Something went wrong analysing your photo.");
        analysis = body as Analysis;
      } catch (e) {
        setPhase({ kind: "error", message: (e as Error).message });
        return;
      }

      setPhase({ kind: "working", step: "saving" });
      try {
        await saveScan(prepared, analysis);
        setPhase({ kind: "done", analysis, saved: true });
      } catch (e) {
        // The analysis is still worth showing even if saving failed.
        setPhase({ kind: "done", analysis, saved: false, saveError: (e as Error).message });
      }
    })();
  }, [photo]);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  if (phase.kind === "working") {
    const idx = STEPS.findIndex((s) => s.key === phase.step);
    return (
      <section className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-8">
        <p className="text-xs uppercase tracking-[0.3em] text-honey">Scan · Step 2 of 2</p>
        <h2 className="mt-3 font-display text-3xl leading-tight">
          Reading your <em className="text-sun">skin</em>
        </h2>
        <div className="relative mt-6 overflow-hidden rounded-[1.5rem] bg-cocoa ring-1 ring-mahogany" style={{ aspectRatio: "3 / 4" }}>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Your selfie" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-espresso/30" />
          <div className="analyze-beam absolute inset-x-0 h-24 bg-gradient-to-b from-transparent to-sun/40">
            <div className="absolute inset-x-0 bottom-0 h-px bg-[#fff3c9]" />
          </div>
        </div>
        <ol className="mt-6 space-y-3" aria-live="polite">
          {STEPS.map((s, i) => (
            <li key={s.key} className={`flex items-center gap-3 text-sm ${i <= idx ? "text-shea" : "text-muted/60"}`}>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  i < idx ? "bg-good/20 text-good" : i === idx ? "bg-sun/20 text-sun" : "bg-mahogany text-muted"
                }`}
              >
                {i < idx ? "✓" : i === idx ? <span className="h-2 w-2 animate-pulse rounded-full bg-sun" /> : i + 1}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
        <p className="mt-auto pt-8 text-center text-xs text-muted">This usually takes 10–30 seconds.</p>
      </section>
    );
  }

  if (phase.kind === "error") {
    return (
      <section className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta/20 text-2xl text-terracotta">!</span>
        <h2 className="mt-5 font-display text-3xl">We couldn&apos;t read this one</h2>
        <p className="mt-3 max-w-sm text-muted">{phase.message}</p>
        <button onClick={onRetake} className="mt-8 w-full rounded-full bg-gradient-to-r from-honey to-sun py-4 font-semibold text-espresso">
          Try another photo
        </button>
      </section>
    );
  }

  return <Results analysis={phase.analysis} photoUrl={url} saved={phase.saved} saveError={phase.saveError} onRetake={onRetake} onJournal={onJournal} />;
}

/* ------------------------------------------------------------------ */

function Results({
  analysis,
  photoUrl,
  saved,
  saveError,
  onRetake,
  onJournal,
}: {
  analysis: Analysis;
  photoUrl: string | null;
  saved: boolean;
  saveError?: string;
  onRetake: () => void;
  onJournal: () => void;
}) {
  const insights = useMemo(() => insightsFrom(analysis.concerns), [analysis]);
  const focus = insights.filter((i) => i.focus);
  const more = insights.filter((i) => !i.focus);
  const picks = useMemo(() => ingredientPicks(insights, analysis.skinType), [insights, analysis.skinType]);
  const withMask = insights.filter((i) => analysis.concerns.find((c) => c.concern === i.concern)?.maskUrl);
  const [overlay, setOverlay] = useState<string | null>(withMask.find((i) => i.concern === "age_spot")?.concern ?? null);
  const maskUrl = overlay ? analysis.concerns.find((c) => c.concern === overlay)?.maskUrl : undefined;
  const darkMarks = insights.find((i) => i.concern === "age_spot");
  const skinType = analysis.skinType?.whole;

  return (
    <section className="mx-auto max-w-md px-5 pb-12 pt-8">
      <p className="text-xs uppercase tracking-[0.3em] text-honey">Your scan</p>
      <h2 className="mt-2 font-display text-[2rem] leading-tight">
        Here&apos;s what your <em className="text-sun">skin</em> is telling us
      </h2>

      {/* photo with YouCam's own detection overlay */}
      <div className="relative mt-5 overflow-hidden rounded-[1.5rem] bg-cocoa ring-1 ring-mahogany" style={{ aspectRatio: "3 / 4" }}>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Your selfie" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {maskUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={maskUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
          {withMask.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {withMask.slice(0, 5).map((i) => (
                <button
                  key={i.concern}
                  onClick={() => setOverlay(overlay === i.concern ? null : i.concern)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                    overlay === i.concern ? "bg-sun text-espresso ring-sun" : "bg-black/40 text-shea ring-white/20"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] text-sand/80">Highlights are YouCam&apos;s own detection maps. Tap to switch.</p>
        </div>
      </div>

      {/* headline */}
      {darkMarks && (
        <div className="mt-6 rounded-2xl bg-cocoa/80 p-5 ring-1 ring-mahogany">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-xl">Dark marks</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BAND_STYLE[darkMarks.band]}`}>{BAND_LABEL[darkMarks.band]}</span>
          </div>
          <p className="mt-2 leading-relaxed text-sand">{darkMarks.says[darkMarks.band]}</p>
          <ScoreBar score={darkMarks.score} />
        </div>
      )}

      <ul className="mt-3 space-y-3">
        {focus
          .filter((i) => i.concern !== "age_spot")
          .map((i) => (
            <InsightRow key={i.concern} i={i} />
          ))}
      </ul>

      {more.length > 0 && (
        <details className="mt-3 rounded-2xl bg-cocoa/60 p-4 ring-1 ring-mahogany">
          <summary className="cursor-pointer text-sm font-semibold text-sand">More about your skin{skinType ? ` · ${skinType} skin` : ""}</summary>
          <ul className="mt-3 space-y-3">
            {more.map((i) => (
              <InsightRow key={i.concern} i={i} compact />
            ))}
          </ul>
        </details>
      )}

      {/* next steps */}
      <h3 className="mt-10 font-display text-2xl">
        Your <em className="text-sun">next steps</em>
      </h3>
      <p className="mt-1 text-sm text-muted">Ingredients to look for, matched to this scan{skinType ? ` and your ${skinType.toLowerCase()} skin` : ""}.</p>
      <ul className="mt-4 space-y-3">
        {picks.map((p) => (
          <li key={p.name} className="rounded-2xl bg-cocoa/70 p-4 ring-1 ring-mahogany">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-shea">{p.name}</p>
              <span className="shrink-0 rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-semibold text-good">{p.for}</span>
            </div>
            <p className="mt-1 text-sm text-sand">{p.why}</p>
            <p className="mt-1 text-xs text-muted">{p.how}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-terracotta/10 p-4 ring-1 ring-terracotta/40">
        <p className="text-sm font-semibold text-shea">Skip these</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-sand">
          {AVOID.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-2xl bg-mahogany/40 p-4 text-sm leading-relaxed text-sand">
        <p className="font-semibold text-shea">What to expect</p>
        <p className="mt-1">
          Dark marks on melanin-rich skin usually fade over <strong>3 to 6 months</strong>, sometimes longer. Scan once a week in the same
          light, and let your journal show you the change.
        </p>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Shine gives cosmetic guidance, not a diagnosis. For anything painful, spreading or worrying, please see a dermatologist.
      </p>

      <p className={`mt-6 text-center text-xs ${saved ? "text-good" : "text-[#f0a383]"}`}>
        {saved ? "✓ Saved to your private journal" : `Not saved: ${saveError}`}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button onClick={onRetake} className="rounded-full py-4 font-semibold text-sand ring-1 ring-mahogany">
          New scan
        </button>
        <button onClick={onJournal} className="rounded-full bg-gradient-to-r from-honey to-sun py-4 font-semibold text-espresso">
          My journal
        </button>
      </div>
    </section>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-mahogany">
        <div className="h-full rounded-full bg-gradient-to-r from-terracotta via-honey to-good" style={{ width: `${Math.max(4, Math.min(100, score))}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>More visible</span>
        <span>{Math.round(score)} / 100</span>
        <span>Clearer</span>
      </div>
    </div>
  );
}

function InsightRow({ i, compact = false }: { i: Insight; compact?: boolean }) {
  return (
    <li className={compact ? "" : "rounded-2xl bg-cocoa/70 p-4 ring-1 ring-mahogany"}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-shea">{i.label}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BAND_STYLE[i.band]}`}>
          {BAND_LABEL[i.band]} · {Math.round(i.score)}
        </span>
      </div>
      <p className="mt-1 text-sm text-sand">{i.says[i.band]}</p>
      {i.caveat && <p className="mt-1.5 text-xs italic text-muted">{i.caveat}</p>}
    </li>
  );
}
