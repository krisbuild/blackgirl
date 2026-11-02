"use client";

import { useState } from "react";

const POINTS = [
  {
    title: "What we look at",
    body: "Dark marks, breakouts, texture and evenness. Your photo goes to YouCam's skin analysis service to be scored.",
  },
  {
    title: "Where your photo lives",
    body: "In your private journal, visible only to you, so you can compare week to week. Delete any scan whenever you like.",
  },
  {
    title: "What this is not",
    body: "This is cosmetic guidance, not a medical diagnosis. For anything painful, spreading or worrying, see a dermatologist.",
  },
];

export function Consent({ onAgree, onBack }: { onAgree: () => void; onBack: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-8">
      <button onClick={onBack} className="self-start text-sm text-muted">
        ← Back
      </button>
      <h2 className="mt-6 font-display text-4xl leading-tight">
        Before we open <em className="text-sun">your camera</em>
      </h2>
      <p className="mt-3 text-muted">Here&apos;s how your photo is used.</p>

      <ol className="mt-8 space-y-4">
        {POINTS.map((p, i) => (
          <li key={p.title} className="flex gap-4 rounded-2xl bg-cocoa/70 p-4 ring-1 ring-mahogany">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-honey/15 font-display text-honey">
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold text-shea">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm text-sand">
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => setOk(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-[var(--honey)]"
        />
        I agree to take a selfie for skin analysis and to store it in my private journal.
      </label>

      <button
        disabled={!ok}
        onClick={onAgree}
        className="mt-auto w-full rounded-full bg-gradient-to-r from-honey to-sun px-6 py-4 text-lg font-semibold text-espresso transition enabled:active:scale-[0.98] disabled:opacity-40"
      >
        Open camera
      </button>
    </section>
  );
}
