"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

/**
 * A short, story-style preview of what the app does, shown before the camera opens.
 * Every slide is an illustration, clearly labelled, never a real result.
 * The last slide asks for camera consent.
 */

const SLIDE_MS = 6500;

/* ------------------------------------------------------------------ */
/* Illustrations                                                       */
/* ------------------------------------------------------------------ */

function FaceScanArt() {
  const marks = [
    { x: 76, y: 132, label: "Dark marks", side: "left" as const, delay: "0.6s" },
    { x: 128, y: 140, label: "Texture", side: "right" as const, delay: "1.4s" },
    { x: 108, y: 84, label: "Breakouts", side: "right" as const, delay: "2.2s" },
  ];
  return (
    <svg viewBox="-78 0 356 220" className="h-[260px] w-full" aria-hidden="true">
      <defs>
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a4a2e" />
          <stop offset="1" stopColor="#4f2d1f" />
        </linearGradient>
        <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6c453" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f6c453" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f6c453" stopOpacity="0" />
        </linearGradient>
        <clipPath id="face-clip">
          <ellipse cx="100" cy="118" rx="58" ry="76" />
        </clipPath>
      </defs>
      {/* hair: a full, rounded afro silhouette */}
      <circle cx="100" cy="88" r="78" fill="#3a2016" />
      <circle cx="46" cy="70" r="30" fill="#45261a" />
      <circle cx="154" cy="70" r="30" fill="#45261a" />
      <circle cx="100" cy="30" r="32" fill="#45261a" />
      {/* face */}
      <ellipse cx="100" cy="118" rx="58" ry="76" fill="url(#skin)" />
      {/* subtle features */}
      <path d="M78 112 q8 -5 16 0" stroke="#2a1710" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M106 112 q8 -5 16 0" stroke="#2a1710" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M100 120 q-6 18 0 22 q6 -4 0 -22" fill="#43261a" opacity="0.7" />
      <path d="M86 160 q14 10 28 0" stroke="#2a1710" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* scan line */}
      <g clipPath="url(#face-clip)">
        <rect className="tour-scan" x="30" y="40" width="140" height="26" fill="url(#scan)" />
      </g>
      {/* oval guide */}
      <ellipse cx="100" cy="118" rx="66" ry="84" fill="none" stroke="#8fcf9a" strokeWidth="2" strokeDasharray="6 6" />
      {/* detection markers */}
      {marks.map((m) => (
        <g key={m.label} className="tour-pop" style={{ animationDelay: m.delay }}>
          <circle cx={m.x} cy={m.y} r="7" fill="none" stroke="#f6c453" strokeWidth="2" />
          <circle cx={m.x} cy={m.y} r="2.5" fill="#f6c453" />
          <line
            x1={m.x}
            y1={m.y}
            x2={m.side === "left" ? 0 : 200}
            y2={m.y}
            stroke="#f6c453"
            strokeWidth="1"
            opacity="0.6"
          />
          <text
            x={m.side === "left" ? -4 : 204}
            y={m.y + 4}
            textAnchor={m.side === "left" ? "end" : "start"}
            fontSize="11"
            fontWeight="600"
            fill="#fbf1e3"
          >
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ProgressArt() {
  // Illustrative fade curve: dark-mark score rising (clearer) over 8 weeks.
  const pts = [52, 55, 57, 61, 63, 67, 70, 74];
  const w = 260, h = 120, pad = 10;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  const y = (v: number) => h - pad - ((v - 45) / 35) * (h - pad * 2);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        {[
          { wk: "Week 1", spots: 7 },
          { wk: "Week 8", spots: 3 },
        ].map((s) => (
          <div key={s.wk} className="rounded-2xl bg-mahogany/60 p-3 ring-1 ring-mahogany">
            <svg viewBox="0 0 100 70" className="w-full" aria-hidden="true">
              <ellipse cx="50" cy="35" rx="40" ry="30" fill="#5c3422" />
              {Array.from({ length: s.spots }, (_, i) => (
                <circle
                  key={i}
                  cx={22 + ((i * 37) % 56)}
                  cy={20 + ((i * 23) % 32)}
                  r={2.2}
                  fill="#2e180f"
                  opacity={s.wk === "Week 1" ? 0.9 : 0.55}
                />
              ))}
            </svg>
            <p className="mt-1 text-center text-xs text-muted">{s.wk}</p>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full" aria-hidden="true">
        <path d={`${d} L${x(pts.length - 1)},${h} L${x(0)},${h} Z`} fill="#f6c453" opacity="0.12" />
        <path d={d} fill="none" stroke="#f6c453" strokeWidth="3" strokeLinecap="round" className="tour-draw" />
        {pts.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#2a1710" stroke="#f6c453" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>Wk 1</span>
        <span>Dark-mark clarity</span>
        <span>Wk 8</span>
      </div>
    </div>
  );
}

function ProductsArt() {
  const picks = [
    { name: "Azelaic acid", why: "Evens out dark marks, kind to breakouts", tag: "Dark marks" },
    { name: "Niacinamide", why: "Brightens and balances oil", tag: "Evenness" },
    { name: "Sheer SPF 50", why: "No white cast. Keeps marks from deepening", tag: "Every day" },
  ];
  return (
    <div className="w-full space-y-2.5">
      {picks.map((p, i) => (
        <div
          key={p.name}
          className="tour-rise flex items-center gap-3 rounded-2xl bg-mahogany/50 p-3 ring-1 ring-mahogany"
          style={{ animationDelay: `${0.2 + i * 0.35}s` }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-honey/15 font-display text-lg text-honey">
            {p.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-shea">{p.name}</p>
            <p className="truncate text-xs text-muted">{p.why}</p>
          </div>
          <span className="shrink-0 rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-semibold text-good">{p.tag}</span>
        </div>
      ))}
      <div
        className="tour-rise flex items-center gap-3 rounded-2xl bg-terracotta/15 p-3 ring-1 ring-terracotta/50"
        style={{ animationDelay: "1.4s" }}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracotta/25 text-lg text-terracotta">
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-shea">Ingredient check</p>
          <p className="text-xs text-muted">Flags mercury, clobetasol and hidden bleaching agents on a label</p>
        </div>
      </div>
    </div>
  );
}

function HairArt() {
  const routine = [
    { day: "Sun", step: "Wash day", sub: "Pre-poo · cleanse · deep condition" },
    { day: "Mon", step: "Moisturise & seal", sub: "LOC method on damp ends" },
    { day: "Wed", step: "Scalp care", sub: "Light oil massage, focus on edges" },
    { day: "Nightly", step: "Protect", sub: "Satin bonnet or pillowcase" },
  ];
  return (
    <div className="w-full">
      <div className="flex items-end justify-between rounded-2xl bg-mahogany/50 p-4 ring-1 ring-mahogany">
        <div>
          <p className="text-xs text-muted">Edges & length</p>
          <p className="font-display text-3xl text-sun">+1.2 cm</p>
          <p className="text-xs text-muted">over 3 months</p>
        </div>
        <svg viewBox="0 0 120 60" className="h-14 w-28" aria-hidden="true">
          {[14, 20, 25, 31, 36, 42].map((v, i) => (
            <rect key={i} x={i * 20 + 4} y={60 - v} width="12" height={v} rx="4" fill="#f6c453" opacity={0.35 + i * 0.12} className="tour-grow" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </svg>
      </div>
      <ol className="mt-3 space-y-2">
        {routine.map((r, i) => (
          <li
            key={r.step}
            className="tour-rise flex items-center gap-3 text-sm"
            style={{ animationDelay: `${0.3 + i * 0.25}s` }}
          >
            <span className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-honey">{r.day}</span>
            <span className="flex-1">
              <span className="font-semibold text-shea">{r.step}</span>
              <span className="block text-xs text-muted">{r.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slides                                                              */
/* ------------------------------------------------------------------ */

type Slide = {
  kicker: string;
  title: ReactNode;
  body: string;
  art: ReactNode;
  badge: string;
};

const SLIDES: Slide[] = [
  {
    kicker: "Face scan",
    title: (
      <>
        Your skin, <em className="text-sun">seen clearly</em>
      </>
    ),
    body: "A guided selfie checks your light, angle and distance, then YouCam's skin AI maps dark marks, breakouts and texture across your face.",
    art: <FaceScanArt />,
    badge: "Example",
  },
  {
    kicker: "Your progress",
    title: (
      <>
        Watch your marks <em className="text-sun">fade</em>
      </>
    ),
    body: "Scan weekly and compare side by side. Dark marks fade over months, not days, so every small win is right here to celebrate.",
    art: <ProgressArt />,
    badge: "Example",
  },
  {
    kicker: "Product picks",
    title: (
      <>
        Ingredients that <em className="text-sun">love melanin</em>
      </>
    ),
    body: "Picks matched to your scan and skin type, plus a label check that flags harsh bleaching ingredients before they touch your skin.",
    art: <ProductsArt />,
    badge: "Example",
  },
  {
    kicker: "Hair care",
    title: (
      <>
        Grow, <em className="text-sun">protect</em>, repeat
      </>
    ),
    body: "Track edges and length, and keep a wash-day routine built for coils, kinks and curls.",
    art: <HairArt />,
    badge: "Coming soon",
  },
];

/* ------------------------------------------------------------------ */
/* Tour                                                                */
/* ------------------------------------------------------------------ */

export function Tour({ onAgree, onBack }: { onAgree: () => void; onBack: () => void }) {
  const total = SLIDES.length + 1; // + consent
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ok, setOk] = useState(false);
  const onConsent = i === SLIDES.length;

  const next = useCallback(() => setI((v) => Math.min(v + 1, total - 1)), [total]);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    if (onConsent || paused) return;
    const t = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, onConsent, paused, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const slide = SLIDES[i];

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      {/* story progress */}
      <div className="flex gap-1.5" role="tablist" aria-label="Preview progress">
        {Array.from({ length: total }, (_, k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === i}
            aria-label={k < SLIDES.length ? SLIDES[k].kicker : "Get started"}
            onClick={() => setI(k)}
            className="h-1 flex-1 overflow-hidden rounded-full bg-mahogany"
          >
            <span
              key={`${k}-${i}-${paused}`}
              className={`block h-full rounded-full bg-sun ${
                k < i ? "w-full" : k === i && !onConsent ? (paused ? "w-1/2" : "tour-fill") : k === i ? "w-full" : "w-0"
              }`}
              style={k === i && !onConsent && !paused ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
            />
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button onClick={i === 0 ? onBack : prev} className="text-muted">
          ← Back
        </button>
        {!onConsent && (
          <button onClick={() => setI(SLIDES.length)} className="text-muted">
            Skip
          </button>
        )}
      </div>

      {!onConsent ? (
        <div
          key={i}
          className="flex flex-1 flex-col"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          <div className="rise mt-6 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-honey">
              {String(i + 1).padStart(2, "0")} · {slide.kicker}
            </p>
            <span className="shrink-0 rounded-full bg-cocoa px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sand ring-1 ring-mahogany">
              {slide.badge}
            </span>
          </div>
          <h2 className="rise rise-1 mt-2 font-display text-[2.1rem] leading-[1.1]">{slide.title}</h2>

          <div className="rise rise-2 mt-5 flex min-h-[290px] items-center justify-center rounded-[1.75rem] bg-cocoa/80 p-5 ring-1 ring-mahogany">
            <div className="flex w-full items-center justify-center">{slide.art}</div>
          </div>

          <p className="rise rise-3 mt-5 text-[15px] leading-relaxed text-muted">{slide.body}</p>

          <button
            onClick={next}
            className="mt-auto w-full rounded-full py-4 font-semibold text-shea ring-1 ring-mahogany transition active:scale-[0.98]"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="rise mt-6 text-xs uppercase tracking-[0.3em] text-honey">Ready when you are</p>
          <h2 className="rise rise-1 mt-2 font-display text-[2.1rem] leading-[1.1]">
            Let&apos;s take your <em className="text-sun">first scan</em>
          </h2>
          <ul className="rise rise-2 mt-6 space-y-3 text-sm leading-relaxed text-muted">
            <li className="flex gap-3">
              <span className="text-honey">◆</span>
              Your selfie goes to YouCam&apos;s skin analysis service to be scored.
            </li>
            <li className="flex gap-3">
              <span className="text-honey">◆</span>
              It&apos;s saved in your private journal, visible only to you. Delete it anytime.
            </li>
            <li className="flex gap-3">
              <span className="text-honey">◆</span>
              This is cosmetic guidance, not a diagnosis. For anything painful or spreading, see a dermatologist.
            </li>
          </ul>

          <label className="rise rise-3 mt-8 flex cursor-pointer items-start gap-3 rounded-2xl bg-cocoa/70 p-4 text-sm text-sand ring-1 ring-mahogany">
            <input
              type="checkbox"
              checked={ok}
              onChange={(e) => setOk(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--honey)]"
            />
            I agree to take a selfie for skin analysis and keep it in my private journal.
          </label>

          <button
            disabled={!ok}
            onClick={onAgree}
            className="mt-auto w-full rounded-full bg-gradient-to-r from-honey to-sun py-4 text-lg font-semibold text-espresso transition enabled:active:scale-[0.98] disabled:opacity-40"
          >
            Open camera
          </button>
        </div>
      )}
    </section>
  );
}
