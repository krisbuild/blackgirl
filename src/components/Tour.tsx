"use client";

import { useState, type ReactNode } from "react";

/**
 * One-screen preview of what the app does, shown before the camera opens.
 * Each tile is an animated illustration, clearly labelled, never a real result.
 * Camera consent sits at the bottom of the same screen.
 */

/* ------------------------------------------------------------------ */
/* Mini illustrations                                                  */
/* ------------------------------------------------------------------ */

function FaceScanArt() {
  const marks = [
    { x: 78, y: 132, delay: "0.5s" },
    { x: 126, y: 140, delay: "1.1s" },
    { x: 108, y: 86, delay: "1.7s" },
  ];
  return (
    <svg viewBox="0 0 200 220" className="h-full w-full" aria-hidden="true">
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
      <circle cx="100" cy="88" r="78" fill="#3a2016" />
      <circle cx="46" cy="70" r="30" fill="#45261a" />
      <circle cx="154" cy="70" r="30" fill="#45261a" />
      <circle cx="100" cy="30" r="32" fill="#45261a" />
      <ellipse cx="100" cy="118" rx="58" ry="76" fill="url(#skin)" />
      <path d="M78 112 q8 -5 16 0" stroke="#2a1710" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M106 112 q8 -5 16 0" stroke="#2a1710" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M100 120 q-6 18 0 22 q6 -4 0 -22" fill="#43261a" opacity="0.7" />
      <path d="M86 160 q14 10 28 0" stroke="#2a1710" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g clipPath="url(#face-clip)">
        <rect className="tour-scan" x="30" y="40" width="140" height="26" fill="url(#scan)" />
      </g>
      <ellipse cx="100" cy="118" rx="66" ry="84" fill="none" stroke="#8fcf9a" strokeWidth="3" strokeDasharray="8 7" />
      {marks.map((m) => (
        <g key={`${m.x}-${m.y}`} className="tour-pop" style={{ animationDelay: m.delay }}>
          <circle cx={m.x} cy={m.y} r="9" fill="none" stroke="#f6c453" strokeWidth="3" />
          <circle cx={m.x} cy={m.y} r="3.5" fill="#f6c453" />
        </g>
      ))}
    </svg>
  );
}

function ProgressArt() {
  const pts = [52, 55, 57, 61, 63, 67, 70, 74];
  const w = 160, h = 90, pad = 8;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  const y = (v: number) => h - 14 - ((v - 45) / 35) * (h - 14 - pad);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden="true">
      <path d={`${d} L${x(pts.length - 1)},${h - 14} L${x(0)},${h - 14} Z`} fill="#f6c453" opacity="0.12" />
      <path d={d} fill="none" stroke="#f6c453" strokeWidth="3" strokeLinecap="round" className="tour-draw" />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.8" fill="#2a1710" stroke="#f6c453" strokeWidth="2" />
      ))}
      <text x={pad} y={h - 2} fontSize="10" fill="#c9ae95">Wk 1</text>
      <text x={w - pad} y={h - 2} fontSize="10" fill="#c9ae95" textAnchor="end">Wk 8</text>
    </svg>
  );
}

function ProductsArt() {
  const picks = [
    { name: "Azelaic acid", flag: false },
    { name: "Niacinamide", flag: false },
    { name: "Sheer SPF 50", flag: false },
    { name: "Mercury", flag: true },
  ];
  return (
    <ul className="flex h-full w-full flex-col justify-center gap-1">
      {picks.map((p, i) => (
        <li
          key={p.name}
          className={`tour-rise flex items-center gap-2 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
            p.flag ? "bg-terracotta/20 text-[#f0a383]" : "bg-good/10 text-shea"
          }`}
          style={{ animationDelay: `${0.2 + i * 0.25}s` }}
        >
          <span className={p.flag ? "text-terracotta" : "text-good"} aria-hidden="true">
            {p.flag ? "✕" : "✓"}
          </span>
          {p.name}
        </li>
      ))}
    </ul>
  );
}

function HairArt() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2">
      <svg viewBox="0 0 120 50" className="h-12 w-full" aria-hidden="true">
        {[12, 18, 23, 29, 34, 40].map((v, i) => (
          <rect
            key={i}
            x={i * 20 + 4}
            y={50 - v}
            width="12"
            height={v}
            rx="4"
            fill="#f6c453"
            opacity={0.35 + i * 0.12}
            className="tour-grow"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-1">
        {["Wash", "Seal", "Scalp", "Bonnet"].map((t) => (
          <span key={t} className="rounded-full bg-honey/15 px-1.5 py-0.5 text-[10px] font-semibold text-honey">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

type Tile = { title: string; line: string; art: ReactNode; badge: string };

const TILES: Tile[] = [
  { title: "Face scan", line: "Maps dark marks, breakouts and texture", art: <FaceScanArt />, badge: "Example" },
  { title: "Progress", line: "Watch marks fade, week by week", art: <ProgressArt />, badge: "Example" },
  { title: "Products", line: "Melanin-friendly, with a label check", art: <ProductsArt />, badge: "Example" },
  { title: "Hair care", line: "Edges, length and wash-day routine", art: <HairArt />, badge: "Soon" },
];

export function Tour({ onAgree, onBack }: { onAgree: () => void; onBack: () => void }) {
  const [ok, setOk] = useState(false);

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-5">
      <button onClick={onBack} className="self-start text-sm text-muted">
        ← Back
      </button>

      <h2 className="rise mt-3 font-display text-[1.9rem] leading-[1.1] [@media(max-height:700px)]:mt-1 [@media(max-height:700px)]:text-2xl">
        Here&apos;s how Shine <em className="text-sun">cares for you</em>
      </h2>

      <ul className="mt-4 grid grid-cols-2 gap-2.5 [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:gap-2">
        {TILES.map((t, i) => (
          <li
            key={t.title}
            className="rise flex flex-col rounded-2xl bg-cocoa/80 p-3 ring-1 ring-mahogany"
            style={{ animationDelay: `${0.1 + i * 0.12}s` }}
          >
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-sm font-semibold text-shea">{t.title}</h3>
              <span className="rounded-full bg-espresso px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted ring-1 ring-mahogany">
                {t.badge}
              </span>
            </div>
            <div className="my-2 flex h-[104px] items-center justify-center [@media(max-height:700px)]:my-1.5 [@media(max-height:700px)]:h-[92px]">{t.art}</div>
            <p className="text-[11px] leading-snug text-muted [@media(max-height:700px)]:hidden">{t.line}</p>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4 [@media(max-height:700px)]:pt-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cocoa/70 p-3 text-[13px] leading-snug text-sand ring-1 ring-mahogany">
          <input
            type="checkbox"
            checked={ok}
            onChange={(e) => setOk(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--honey)]"
          />
          <span>
            I agree to send my selfie to YouCam&apos;s skin analysis and keep it in my private journal, visible
            only to me. Cosmetic guidance, not a diagnosis.
          </span>
        </label>

        <button
          disabled={!ok}
          onClick={onAgree}
          className="mt-3 w-full rounded-full bg-gradient-to-r from-honey to-sun py-4 text-lg font-semibold text-espresso transition enabled:active:scale-[0.98] disabled:opacity-40"
        >
          Open camera
        </button>
      </div>
    </section>
  );
}
