"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * "How accurate is this?" — a small pop-up card: what we tested on deep skin, what YouCam
 * caught and missed, how the camera prevents bad photos, and the cosmetic-guidance line.
 */
const POINTS = [
  { icon: "✓", tone: "text-good", text: "Tested on deep skin (Fitzpatrick V–VI): an HD selfie found 61 dark marks and 8 acne spots, mapped to the right places." },
  { icon: "!", tone: "text-honey", text: "The score alone can read \"clear\" when the map shows dozens of marks, so Shine leads with the count." },
  { icon: "!", tone: "text-honey", text: "Small, flat or glare-covered spots can be missed. Tap \"I have more\" and your plan adjusts. Redness isn't rated on deep skin." },
  { icon: "◎", tone: "text-sun", text: "The camera checks distance, angle and light before taking the photo, and zooms in once if your face is too far away." },
];

export function Accuracy({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portal to <body>: animated (transformed) parents would otherwise trap a fixed overlay inside them.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accuracy-title"
        onClick={(e) => e.stopPropagation()}
        className="rise max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-cocoa p-5 shadow-2xl ring-1 ring-mahogany"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-honey">Shine · Honest numbers</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h2 id="accuracy-title" className="font-display text-2xl leading-tight">
            How accurate <em className="text-sun">is this?</em>
          </h2>
          <button onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded-full px-2 py-1 text-lg text-muted">
            ✕
          </button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {POINTS.map((p) => (
            <li key={p.text} className="flex gap-2.5 text-[13px] leading-relaxed text-sand">
              <span className={`mt-0.5 w-3 shrink-0 text-center font-bold ${p.tone}`} aria-hidden="true">
                {p.icon}
              </span>
              {p.text}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-2xl bg-honey/10 p-3 text-xs leading-relaxed text-sand ring-1 ring-honey/30">
          <strong className="text-shea">Cosmetic guidance, not a diagnosis.</strong> See a dermatologist for persistent or severe concerns.
        </p>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-gradient-to-r from-honey to-sun py-3 font-semibold text-espresso">
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
}
