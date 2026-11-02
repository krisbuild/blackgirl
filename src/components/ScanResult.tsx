"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { prepareForAnalysis } from "@/lib/image";
import { BAND_LABEL, insightsFrom, type Band, type Insight } from "@/lib/insights";
import { firstScanDate, saveScan, type Analysis } from "@/lib/journal";
import { DarkMarkPlan } from "./DarkMarkPlan";
import { SkinViewer } from "./SkinViewer";

type Phase =
  | { kind: "working"; step: "preparing" | "analyzing" | "saving" }
  | { kind: "error"; message: string }
  | { kind: "done"; analysis: Analysis; scanId?: string; firstScan?: string | null; saveError?: string };

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
        const scan = await saveScan(prepared, analysis);
        const firstScan = await firstScanDate().catch(() => scan.created_at);
        setPhase({ kind: "done", analysis, scanId: scan.id, firstScan });
      } catch (e) {
        // The analysis is still worth showing even if saving failed.
        setPhase({ kind: "done", analysis, saveError: (e as Error).message });
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

  return (
    <Results
      analysis={phase.analysis}
      photoUrl={url}
      scanId={phase.scanId}
      firstScan={phase.firstScan}
      saveError={phase.saveError}
      onRetake={onRetake}
      onJournal={onJournal}
    />
  );
}

/* ------------------------------------------------------------------ */

function Results({
  analysis,
  photoUrl,
  scanId,
  firstScan,
  saveError,
  onRetake,
  onJournal,
}: {
  analysis: Analysis;
  photoUrl: string | null;
  scanId?: string;
  firstScan?: string | null;
  saveError?: string;
  onRetake: () => void;
  onJournal: () => void;
}) {
  const insights = useMemo(() => insightsFrom(analysis.concerns), [analysis]);
  const focus = insights.filter((i) => i.focus);
  const more = insights.filter((i) => !i.focus);
  const darkMarks = insights.find((i) => i.concern === "age_spot");
  const acne = insights.find((i) => i.concern === "acne");
  const skinType = analysis.skinType?.whole;

  return (
    <section className="mx-auto max-w-md px-5 pb-12 pt-8">
      <p className="text-xs uppercase tracking-[0.3em] text-honey">Your scan</p>
      <h2 className="mt-2 font-display text-[2rem] leading-tight">
        Your dark marks, <em className="text-sun">up close</em>
      </h2>

      <SkinViewer photoUrl={photoUrl} analysis={analysis} />

      {/* the two headline concerns */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[darkMarks, acne].filter((x): x is Insight => !!x).map((i) => (
          <div key={i.concern} className="rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
            <p className="text-xs uppercase tracking-wider text-muted">{i.label}</p>
            <p className="mt-1 font-display text-3xl text-shea">{Math.round(i.score)}</p>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${BAND_STYLE[i.band]}`}>{BAND_LABEL[i.band]}</span>
            <ScoreBar score={i.score} compact />
          </div>
        ))}
      </div>
      {darkMarks && <p className="mt-3 leading-relaxed text-sand">{darkMarks.says[darkMarks.band]}</p>}
      {acne && <p className="mt-2 text-sm leading-relaxed text-muted">{acne.says[acne.band]}</p>}

      <DarkMarkPlan analysis={analysis} scanId={scanId} firstScan={firstScan} />

      {/* everything else */}
      <h3 className="mt-10 font-display text-xl">The rest of your skin</h3>
      <ul className="mt-3 space-y-3">
        {focus
          .filter((i) => i.concern !== "age_spot" && i.concern !== "acne")
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

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Shine gives cosmetic guidance, not a diagnosis. For anything painful, spreading or worrying, please see a dermatologist.
      </p>

      <p className={`mt-6 text-center text-xs ${scanId ? "text-good" : "text-[#f0a383]"}`}>
        {scanId ? "✓ Saved to your private journal" : `Not saved: ${saveError}`}
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

function ScoreBar({ score, compact = false }: { score: number; compact?: boolean }) {
  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <div className="h-2 overflow-hidden rounded-full bg-mahogany">
        <div className="h-full rounded-full bg-gradient-to-r from-terracotta via-honey to-good" style={{ width: `${Math.max(4, Math.min(100, score))}%` }} />
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>More visible</span>
          <span>{Math.round(score)} / 100</span>
          <span>Clearer</span>
        </div>
      )}
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
