"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { checkIngredients, VERDICT_LABEL, type SkinProfile, type Verdict } from "@/lib/ingredients";
import { bandFromCount, bandOf } from "@/lib/insights";
import { countOf, listScans, scoreOf } from "@/lib/journal";
import { readLabel } from "@/lib/ocr";

const VERDICT_STYLE: Record<Verdict, string> = {
  great: "bg-good/15 text-good ring-good/40",
  good: "bg-good/10 text-good ring-good/30",
  okay: "bg-sun/10 text-sun ring-sun/30",
  caution: "bg-honey/15 text-honey ring-honey/40",
  avoid: "bg-terracotta/20 text-[#f0a383] ring-terracotta/50",
};

/** Build the skin profile from the latest scan (or a dark-marks + acne default). */
function useProfile() {
  const [profile, setProfile] = useState<{ p: SkinProfile; summary: string } | null>(null);
  useEffect(() => {
    listScans()
      .then((scans) => {
        const s = scans[scans.length - 1];
        if (!s) throw new Error("no scans");
        const oily = Object.values(s.skin_type ?? {}).some((t) => /oily/i.test(t));
        const dry = Object.values(s.skin_type ?? {}).some((t) => /dry/i.test(t));
        const dmCount = countOf(s, "age_spot"), acneCount = countOf(s, "acne");
        const dmScore = scoreOf(s, "age_spot"), acneScore = scoreOf(s, "acne");
        const notClear = (score?: number, b?: string) => (score != null && bandOf(score) !== "clear") || (b != null && b !== "clear");
        const darkMarks = notClear(dmScore, bandFromCount("age_spot", dmCount));
        const acne = notClear(acneScore, bandFromCount("acne", acneCount));
        const bits = [
          s.skin_type?.whole ? `${s.skin_type.whole.toLowerCase()} skin` : null,
          dmCount != null ? `${dmCount} dark marks` : darkMarks ? "dark marks" : null,
          acneCount != null ? `${acneCount} acne spots` : acne ? "acne" : null,
        ].filter(Boolean);
        setProfile({ p: { oily, dry, darkMarks, acne, fromScan: true }, summary: `Matched to your last scan: ${bits.join(" · ")}` });
      })
      .catch(() => setProfile({ p: { darkMarks: true, acne: true }, summary: "No scan yet, so we're checking for dark marks and acne. Scan your face for a personal verdict." }));
  }, []);
  return profile;
}

export function ProductCheck({ onBack }: { onBack: () => void }) {
  const profile = useProfile();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [reading, setReading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const report = useMemo(() => (text.trim().length > 5 && profile ? checkIngredients(text, profile.p) : null), [text, profile]);

  const onFile = async (f?: File | null) => {
    if (!f) return;
    setError(null);
    setText(""); // clear the previous product while the new label is read
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(f));
    setReading(0);
    try {
      const t = await readLabel(f, setReading);
      if (t.trim().length < 5) throw new Error("We couldn't read any text. Try a closer, sharper photo of just the ingredient list.");
      setText(t);
      setShowPaste(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(null);
    }
  };

  return (
    <section className="mx-auto max-w-md px-5 pb-12 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted">
          ← Back
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-honey">Product check</span>
      </div>
      <h2 className="mt-3 font-display text-[2rem] leading-tight">
        Is it <em className="text-sun">good for my skin?</em>
      </h2>
      <p className="mt-2 text-sm text-sand">Snap the ingredient list on any skincare product. We&apos;ll read it and check it against your skin.</p>
      {profile && <p className="mt-3 rounded-xl bg-espresso/60 p-3 text-xs text-muted">{profile.summary}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl bg-gradient-to-r from-honey to-sun px-4 py-4 text-sm font-semibold text-espresso"
        >
          📷 Photograph ingredients
        </button>
        <button onClick={() => setShowPaste(true)} className="rounded-2xl px-4 py-4 text-sm font-semibold text-sand ring-1 ring-mahogany">
          Type or paste the list
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = ""; // allow picking the same file again
        }}
      />

      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Ingredient label" className="mt-4 max-h-48 w-full rounded-2xl object-cover ring-1 ring-mahogany" />
      )}
      {reading != null && (
        <div className="mt-4">
          <p className="text-sm text-sand">Reading the label… {Math.round(reading * 100)}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mahogany">
            <div className="h-full rounded-full bg-sun transition-all" style={{ width: `${Math.max(4, reading * 100)}%` }} />
          </div>
        </div>
      )}
      {error && <p className="mt-4 rounded-xl bg-terracotta/15 p-3 text-sm text-[#f0a383]">{error}</p>}

      {showPaste && (
        <label className="mt-4 block">
          <span className="text-xs text-muted">{photo ? "What we read. Fix anything that looks wrong:" : "Ingredients (comma separated):"}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Aqua, Niacinamide, Glycerin, Zinc PCA…"
            className="mt-1 w-full rounded-2xl bg-cocoa/80 p-3 text-sm text-shea ring-1 ring-mahogany placeholder:text-muted/60 focus:outline-none focus:ring-honey"
          />
        </label>
      )}

      {report && (
        <div className="mt-6 space-y-3" aria-live="polite">
          <div className={`rounded-2xl p-4 ring-1 ${VERDICT_STYLE[report.verdict]}`}>
            <p className="text-xs font-semibold uppercase tracking-wider">{VERDICT_LABEL[report.verdict]}</p>
            <p className="mt-1 font-display text-xl text-shea">{report.headline}</p>
            <p className="mt-1 text-[11px] text-muted">Read {report.count} ingredients.</p>
          </div>

          {report.avoid.length > 0 && (
            <Section title="Avoid" tone="text-[#f0a383]" items={report.avoid} />
          )}
          {report.cautions.length > 0 && <Section title="Use with care" tone="text-honey" items={report.cautions} />}
          {report.goods.length > 0 && (
            <Section
              title="Good stuff"
              tone="text-good"
              items={[...report.goods].sort((a, b) => Number(b.forYou) - Number(a.forYou))}
              tag={(g) => ("forYou" in g && g.forYou ? "For your skin" : undefined)}
            />
          )}
          {report.notes.map((n) => (
            <p key={n} className="rounded-xl bg-mahogany/40 p-3 text-xs leading-relaxed text-sand">
              {n}
            </p>
          ))}
        </div>
      )}

      <p className="mt-8 text-[11px] leading-relaxed text-muted">
        Product check reads the label only. It can&apos;t tell whether a product is genuine or counterfeit, and reading a
        photo can miss words, so check the list above. Cosmetic guidance, not medical advice.
      </p>
    </section>
  );
}

function Section<T extends { label: string; why: string; ingredient: string }>({
  title,
  tone,
  items,
  tag,
}: {
  title: string;
  tone: string;
  items: T[];
  tag?: (t: T) => string | undefined;
}) {
  return (
    <div className="rounded-2xl bg-cocoa/70 p-4 ring-1 ring-mahogany">
      <p className={`text-sm font-semibold ${tone}`}>{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((it) => (
          <li key={it.label}>
            <p className="text-sm font-semibold text-shea">
              {it.label}
              {tag?.(it) && <span className="ml-2 rounded-full bg-good/15 px-1.5 py-0.5 text-[10px] text-good">{tag(it)}</span>}
            </p>
            <p className="text-xs leading-relaxed text-muted">
              {it.why} <span className="italic">({it.ingredient})</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
