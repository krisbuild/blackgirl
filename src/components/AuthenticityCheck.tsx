"use client";

import { useRef, useState } from "react";
import { RED_FLAGS, type AuthReport, type DbLookup, type RedFlag } from "@/lib/authenticity";

type BarcodeDetectorLike = { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> };
declare global {
  interface Window {
    BarcodeDetector?: new (o?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

/** Warning-sign check for counterfeit skincare. Never claims a product is genuine. */
export function AuthenticityCheck() {
  const [barcode, setBarcode] = useState("");
  const [brand, setBrand] = useState("");
  const [nafdac, setNafdac] = useState("");
  const [nigeria, setNigeria] = useState(true);
  const [authorised, setAuthorised] = useState(false);
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [report, setReport] = useState<(AuthReport & { lookup?: DbLookup }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const readBarcode = async (f?: File | null) => {
    if (!f) return;
    setNote(null);
    if (!window.BarcodeDetector) {
      setNote("This browser can't read barcodes from photos yet. Type the numbers under the barcode instead.");
      return;
    }
    try {
      const bmp = await createImageBitmap(f);
      const codes = await new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }).detect(bmp);
      if (codes[0]) setBarcode(codes[0].rawValue);
      else setNote("We couldn't find a barcode in that photo. Try closer and in good light, or type the numbers.");
    } catch {
      setNote("We couldn't read that photo. Type the numbers under the barcode instead.");
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/authenticity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, claimedBrand: brand, nafdac: nafdac || undefined, soldInNigeria: nigeria, authorisedSeller: authorised, flags }),
      });
      setReport(await res.json());
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1 w-full rounded-xl bg-cocoa/80 px-3 py-2.5 text-sm text-shea ring-1 ring-mahogany placeholder:text-muted/60 focus:outline-none focus:ring-honey";

  return (
    <div className="mt-5">
      <p className="rounded-xl bg-espresso/60 p-3 text-xs leading-relaxed text-muted">
        No app can prove a product is genuine from a photo. This checks for <strong className="text-sand">warning signs</strong> of fakes, so
        you know when to double-check with the brand or NAFDAC.
      </p>

      <label className="mt-4 block text-xs text-muted">
        Barcode
        <div className="flex gap-2">
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} inputMode="numeric" placeholder="e.g. 3337875597197" className={field} />
          <button onClick={() => fileRef.current?.click()} className="mt-1 shrink-0 rounded-xl px-3 text-sm font-semibold text-honey ring-1 ring-honey/50">
            📷 Scan
          </button>
        </div>
      </label>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void readBarcode(e.target.files?.[0]); e.target.value = ""; }} />
      {note && <p className="mt-1 text-[11px] text-honey">{note}</p>}

      <label className="mt-3 block text-xs text-muted">
        Brand on the pack
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. CeraVe" className={field} />
      </label>
      <label className="mt-3 block text-xs text-muted">
        NAFDAC number (if shown)
        <input value={nafdac} onChange={(e) => setNafdac(e.target.value)} placeholder="e.g. 02-1234" className={field} />
      </label>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          { on: nigeria, set: setNigeria, label: "Bought in Nigeria" },
          { on: authorised, set: setAuthorised, label: "From the brand or an authorised shop" },
        ].map((t) => (
          <button
            key={t.label}
            onClick={() => t.set(!t.on)}
            aria-pressed={t.on}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${t.on ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-sand">Tick anything you noticed</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {RED_FLAGS.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-start gap-2 text-xs text-sand">
            <input
              type="checkbox"
              checked={flags.includes(f.id)}
              onChange={() => setFlags((cur) => (cur.includes(f.id) ? cur.filter((x) => x !== f.id) : [...cur, f.id]))}
              className="mt-0.5 h-4 w-4 accent-[var(--honey)]"
            />
            {f.label}
          </label>
        ))}
      </div>

      <button
        onClick={run}
        disabled={busy}
        className="mt-5 w-full rounded-full bg-gradient-to-r from-honey to-sun py-3.5 font-semibold text-espresso disabled:opacity-50"
      >
        {busy ? "Checking…" : "Check for warning signs"}
      </button>

      {report && (
        <div className="mt-5 space-y-3" aria-live="polite">
          <div
            className={`rounded-2xl p-4 ring-1 ${
              report.level === "warnings" ? "bg-terracotta/20 ring-terracotta/50" : "bg-good/10 ring-good/30"
            }`}
          >
            <p className="font-display text-xl text-shea">{report.headline}</p>
            {report.level === "none-found" && (
              <p className="mt-1 text-xs text-sand">That&apos;s reassuring, but it isn&apos;t proof. Confirm with the steps below if you&apos;re unsure.</p>
            )}
          </div>
          {report.warnings.length > 0 && (
            <ul className="space-y-1.5 rounded-2xl bg-cocoa/70 p-4 text-xs leading-relaxed text-sand ring-1 ring-mahogany">
              {report.warnings.map((w) => (
                <li key={w}>⚠️ {w}</li>
              ))}
            </ul>
          )}
          {report.checks.length > 0 && (
            <ul className="space-y-1.5 rounded-2xl bg-cocoa/70 p-4 text-xs leading-relaxed text-sand ring-1 ring-mahogany">
              {report.checks.map((c) => (
                <li key={c}>✓ {c}</li>
              ))}
            </ul>
          )}
          {report.lookup?.error && (
            <p className="text-[11px] text-muted">We couldn&apos;t reach the product database just now, so that check was skipped.</p>
          )}
          <div className="rounded-2xl bg-mahogany/40 p-4">
            <p className="text-sm font-semibold text-shea">Next steps</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-sand">
              {report.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
