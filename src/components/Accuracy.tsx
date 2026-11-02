"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * "How accurate is this?" — what we tested on deep skin, what the API caught and missed,
 * the capture errors we hit and how the app prevents them. Opens as an overlay so the
 * screen underneath (e.g. your results) is kept.
 */
const TESTS = [
  {
    photo: "Real deep-skin selfie, HD (1080 px+)",
    marks: "61 dark marks · 8 acne spots",
    note: "Most marks found on the forehead and cheeks. The person saw a little more acne than this.",
  },
  {
    photo: "Same selfie, standard resolution",
    marks: "44 dark marks · 9 acne spots",
    note: "Lower resolution found about a quarter fewer dark marks. So Shine switches to HD automatically.",
  },
  {
    photo: "Deep-skin portrait with visible cheek marks",
    marks: "14 dark marks · 3 acne spots",
    note: "Marks on both cheeks were found and ringed in the right places.",
  },
];

const CAUGHT = [
  "Dark marks on deep skin: YouCam's detection map found them, and Shine counts each one and shows where it sits.",
  "Oily vs dry skin, pores, texture and undereye darkness gave consistent readings.",
];

const MISSED = [
  "The dark-mark score alone read \"clear\" (87–94 out of 100) on faces where the map showed 14–61 marks. Shine leads with the count, not the score.",
  "Redness read a perfect 100 on every deep-skin photo, so Shine labels it unreliable and doesn't rate it.",
  "Small, flat or glare-covered spots can be missed. That's why every result asks \"Does this match your mirror?\" and plans for more if you say so.",
];

const CAPTURE = [
  {
    error: "\"Face too small\"",
    seen: "Our first phone scans failed: YouCam needs the face to fill most of the photo.",
    fix: "The camera tells you to come closer, and if a photo is still too far, Shine zooms in on your face and retries once automatically.",
  },
  {
    error: "\"Face turned too far\"",
    seen: "YouCam rejects faces turned or tilted away from the camera.",
    fix: "The guided camera checks you're facing forward, chin level, before it takes the photo.",
  },
  {
    error: "Shadows and glare",
    seen: "Overhead light and oily shine can look like, or hide, dark marks on deep skin.",
    fix: "The camera checks your light live, and the tips ask you to face a window and blot shine first.",
  },
];

export function Accuracy({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Portal to <body>: animated (transformed) parents would otherwise trap a fixed overlay inside them.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="accuracy-title" className="fixed inset-0 z-50 overflow-y-auto bg-espresso">
      <section className="mx-auto max-w-md px-5 pb-12 pt-6">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-muted">
            ← Back
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-honey">Honest numbers</span>
        </div>
        <h2 id="accuracy-title" className="mt-3 font-display text-[2rem] leading-tight">
          How accurate <em className="text-sun">is this?</em>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-sand">
          Skin AI is usually tested on lighter skin. We ran real YouCam AI Skin Analysis scans on deep skin tones
          (Fitzpatrick V–VI) and wrote down what it caught and what it missed.
        </p>

        <h3 className="mt-7 font-display text-xl">What we tested</h3>
        <ul className="mt-3 space-y-2.5">
          {TESTS.map((t) => (
            <li key={t.photo} className="rounded-2xl bg-cocoa/80 p-4 ring-1 ring-mahogany">
              <p className="text-xs uppercase tracking-wider text-muted">{t.photo}</p>
              <p className="mt-1 font-semibold text-shea">{t.marks}</p>
              <p className="mt-1 text-xs leading-relaxed text-sand">{t.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted">A small test: 3 photos of deep skin. We&apos;ll keep adding to it.</p>

        <h3 className="mt-7 font-display text-xl">What it caught</h3>
        <ul className="mt-2 space-y-2">
          {CAUGHT.map((c) => (
            <li key={c} className="flex gap-2 text-sm leading-relaxed text-sand">
              <span className="text-good">✓</span>
              {c}
            </li>
          ))}
        </ul>

        <h3 className="mt-7 font-display text-xl">What it missed</h3>
        <ul className="mt-2 space-y-2">
          {MISSED.map((c) => (
            <li key={c} className="flex gap-2 text-sm leading-relaxed text-sand">
              <span className="text-honey">!</span>
              {c}
            </li>
          ))}
        </ul>

        <h3 className="mt-7 font-display text-xl">Photo problems we hit, and how Shine prevents them</h3>
        <ul className="mt-3 space-y-2.5">
          {CAPTURE.map((c) => (
            <li key={c.error} className="rounded-2xl bg-cocoa/70 p-4 ring-1 ring-mahogany">
              <p className="font-semibold text-shea">{c.error}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{c.seen}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-sand">
                <span className="font-semibold text-good">Shine: </span>
                {c.fix}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-7 rounded-2xl bg-honey/10 p-4 ring-1 ring-honey/40">
          <p className="font-semibold text-shea">Cosmetic guidance, not a diagnosis.</p>
          <p className="mt-1 text-sm leading-relaxed text-sand">
            See a dermatologist for persistent or severe concerns, or for any spot that hurts, grows, bleeds or changes colour.
          </p>
        </div>

        <button onClick={onClose} className="mt-8 w-full rounded-full bg-gradient-to-r from-honey to-sun py-4 font-semibold text-espresso">
          Got it
        </button>
      </section>
    </div>,
    document.body,
  );
}
