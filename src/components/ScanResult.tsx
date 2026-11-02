"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { prepareForAnalysis, zoomToFace } from "@/lib/image";
import { BAND_LABEL, insightsFrom, type Band, type Insight } from "@/lib/insights";
import { whereSummary, type MarkStats } from "@/lib/marks-shared";
import { firstScanDate, saveScan, updateScanNote, type Analysis, type Feel, type ScanNote } from "@/lib/journal";
import { Accuracy } from "./Accuracy";
import { DarkMarkPlan } from "./DarkMarkPlan";
import { Reminders } from "./Reminders";
import { SkinViewer } from "./SkinViewer";

type Phase =
  | { kind: "working"; step: "preparing" | "analyzing" | "saving" }
  | { kind: "error"; message: string; code?: string }
  | { kind: "done"; analysis: Analysis; scanId?: string; firstScan?: string | null; saveError?: string; zoomed?: boolean };

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
  onProduct,
}: {
  photo: Blob;
  onRetake: () => void;
  onJournal: () => void;
  onProduct?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "working", step: "preparing" });
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | undefined>();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      let prepared: Blob;
      try {
        const p = await prepareForAnalysis(photo);
        prepared = p.blob;
        setSize({ width: p.width, height: p.height });
        setUrl(URL.createObjectURL(prepared));
      } catch (e) {
        setPhase({ kind: "error", message: (e as Error).message });
        return;
      }

      setPhase({ kind: "working", step: "analyzing" });
      let analysis: Analysis;
      const send = async (img: Blob) => {
        const form = new FormData();
        form.append("image", img, "selfie.jpg");
        const res = await fetch("/api/analyze", { method: "POST", body: form });
        const body = await res.json().catch(() => ({
          error:
            res.status === 504 || res.status === 408
              ? "The analysis took too long this time. Please try again."
              : "Our server hit a snag reading this photo. Please try again.",
          code: `http_${res.status}`,
        }));
        return { ok: res.ok, status: res.status, body };
      };
      let zoomed = false;
      try {
        let r = await send(prepared);
        // Face too small for YouCam (must fill > 60% of the width): zoom in on the centre and retry once.
        if (!r.ok && r.body.code === "error_src_face_too_small") {
          const z = await zoomToFace(prepared);
          prepared = z.blob;
          setSize({ width: z.width, height: z.height });
          setUrl(URL.createObjectURL(prepared));
          zoomed = true;
          r = await send(prepared);
        }
        if (!r.ok) {
          setPhase({
            kind: "error",
            message: r.body.error ?? "Something went wrong analysing your photo.",
            code: r.body.code ?? `http_${r.status}`,
          });
          return;
        }
        analysis = r.body as Analysis;
      } catch (e) {
        setPhase({ kind: "error", message: "We couldn't reach the analysis service. Check your connection and try again.", code: (e as Error).name });
        return;
      }

      setPhase({ kind: "working", step: "saving" });
      try {
        const scan = await saveScan(prepared, analysis);
        const firstScan = await firstScanDate().catch(() => scan.created_at);
        setPhase({ kind: "done", analysis, scanId: scan.id, firstScan, zoomed });
      } catch (e) {
        // The analysis is still worth showing even if saving failed.
        setPhase({ kind: "done", analysis, saveError: (e as Error).message, zoomed });
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
        {phase.code && <p className="mt-2 text-[10px] text-muted/70">Code: {phase.code}</p>}
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
      size={size}
      scanId={phase.scanId}
      firstScan={phase.firstScan}
      saveError={phase.saveError}
      zoomed={phase.zoomed}
      onRetake={onRetake}
      onJournal={onJournal}
      onProduct={onProduct}
    />
  );
}

/* ------------------------------------------------------------------ */

function Results({
  analysis,
  photoUrl,
  size,
  scanId,
  firstScan,
  saveError,
  zoomed,
  onRetake,
  onJournal,
  onProduct,
}: {
  analysis: Analysis;
  photoUrl: string | null;
  size?: { width: number; height: number };
  scanId?: string;
  firstScan?: string | null;
  saveError?: string;
  zoomed?: boolean;
  onRetake: () => void;
  onJournal: () => void;
  onProduct?: () => void;
}) {
  const [showAccuracy, setShowAccuracy] = useState(false);
  const insights = useMemo(() => insightsFrom(analysis.concerns), [analysis]);
  const focus = insights.filter((i) => i.focus);
  const more = insights.filter((i) => !i.focus);
  const darkMarks = insights.find((i) => i.concern === "age_spot");
  const acne = insights.find((i) => i.concern === "acne");
  const skinType = analysis.skinType?.whole;
  const [note, setNote] = useState<ScanNote>({});
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const patchNote = (patch: ScanNote) => {
    const next: ScanNote = { ...note, ...patch, feel: { ...note.feel, ...patch.feel } };
    setNote(next);
    if (!scanId) return;
    updateScanNote(scanId, next)
      .then(() => setNoteStatus("Saved with this scan"))
      .catch(() => setNoteStatus("Couldn't save your answer, but your plan is updated"));
  };
  const feel = (k: "age_spot" | "acne") => ({ value: note.feel?.[k], set: (f: Feel) => patchNote({ feel: { [k]: f } }) });

  return (
    <section className="mx-auto max-w-md px-5 pb-12 pt-8">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-honey">
        Your scan
        {analysis.quality === "hd" && (
          <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] tracking-wider text-good">HD analysis</span>
        )}
      </p>
      <h2 className="mt-2 font-display text-[2rem] leading-tight">
        Your dark marks, <em className="text-sun">up close</em>
      </h2>

      <SkinViewer photoUrl={photoUrl} analysis={analysis} size={size} />

      {/* the two headline concerns: counted marks first, YouCam's score second */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[darkMarks, acne].filter((x): x is Insight => !!x).map((i) => (
          <div key={i.concern} className="rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
            <p className="text-xs uppercase tracking-wider text-muted">{i.label}</p>
            {i.count != null ? (
              <p className="mt-1 font-display text-4xl text-shea">
                {i.count}
                <span className="ml-1 font-sans text-xs text-muted">found</span>
              </p>
            ) : (
              <p className="mt-1 font-display text-4xl text-shea">{Math.round(i.score)}</p>
            )}
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${BAND_STYLE[i.band]}`}>{BAND_LABEL[i.band]}</span>
            <p className="mt-2 text-[11px] text-muted">YouCam score {Math.round(i.score)} / 100</p>
          </div>
        ))}
      </div>
      {darkMarks && <MarkSummary label="dark mark" i={darkMarks} stats={analysis.marks?.darkMarks} feel={feel("age_spot")} />}
      {darkMarks && <p className="mt-2 leading-relaxed text-sand">{darkMarks.says[darkMarks.band]}</p>}
      {acne && <MarkSummary label="acne spot" i={acne} stats={analysis.marks?.acne} feel={feel("acne")} />}
      {acne && <p className="mt-2 text-sm leading-relaxed text-muted">{acne.says[acne.band]}</p>}

      <Confidence quality={analysis.quality} zoomed={zoomed} onMore={() => setShowAccuracy(true)} />

      <DarkMarkPlan analysis={analysis} firstScan={firstScan} note={note} onNote={patchNote} noteStatus={noteStatus} onCheckProduct={onProduct} />

      <Reminders />

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
        Cosmetic guidance, not a diagnosis. See a dermatologist for persistent or severe concerns, or anything painful,
        spreading or worrying.{" "}
        <button onClick={() => setShowAccuracy(true)} className="font-semibold text-honey underline underline-offset-2">
          How accurate is this?
        </button>
      </p>
      {showAccuracy && <Accuracy onClose={() => setShowAccuracy(false)} />}

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

/** "YouCam found 14 dark marks, mostly on your left cheek. They cover 0.3% of your face." */
function MarkSummary({
  label,
  i,
  stats,
  feel,
}: {
  label: string;
  i: Insight;
  stats?: MarkStats;
  feel: { value?: Feel; set: (f: Feel) => void };
}) {
  if (i.count == null) return null;
  const where = stats ? whereSummary(stats.zones) : null;
  const plural = i.count === 1 ? label : `${label}s`;
  return (
    <div className="mt-3 rounded-xl bg-espresso/60 p-3 text-sm leading-relaxed text-sand">
      <p>
        YouCam&apos;s detection map shows <strong className="text-shea">{i.count} {plural}</strong>
        {where ? `, ${where}` : ""}.
        {i.coveragePct != null && i.coveragePct >= 0.1 ? ` Together they cover ${i.coveragePct}% of your face.` : ""}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">Does this match your mirror?</span>
        {(
          [
            ["right", "About right"],
            ["more", `I have more`],
            ["fewer", "Fewer"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => feel.set(v)}
            aria-pressed={feel.value === v}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
              feel.value === v ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/** How much to trust this reading, from what we know about the photo. */
function Confidence({ quality, zoomed, onMore }: { quality?: "hd" | "sd"; zoomed?: boolean; onMore: () => void }) {
  const lower = quality !== "hd" || zoomed;
  const points = [
    quality === "hd"
      ? "HD photo: small marks are easier to see."
      : "Lower confidence: this photo was below HD, so small or faint marks may be missed. A closer photo in daylight reads better.",
    ...(zoomed ? ["We had to zoom in to find your face, so the photo is softer. Hold the phone a little closer next time."] : []),
    "AI can miss flat or glare-covered spots on deep skin. If you see more in the mirror, tap \"I have more\" and your plan adjusts.",
  ];
  return (
    <div className={`mt-5 rounded-2xl p-4 ring-1 ${lower ? "bg-honey/10 ring-honey/40" : "bg-cocoa/70 ring-mahogany"}`}>
      <p className="text-sm font-semibold text-shea">{lower ? "Reading confidence: lower" : "Reading confidence: good"}</p>
      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-sand">
        {points.map((t) => (
          <li key={t}>· {t}</li>
        ))}
      </ul>
      <button onClick={onMore} className="mt-2 text-xs font-semibold text-honey underline underline-offset-2">
        How accurate is this?
      </button>
    </div>
  );
}
