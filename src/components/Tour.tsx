"use client";

import type { ReactNode } from "react";
import { ScanShowcase } from "./ScanShowcase";

/**
 * One-screen preview shown before the camera opens: a live-scan showcase on top,
 * and the rest of the app (progress, products, hair care) as compact tiles below.
 */

function Sparkline() {
  const pts = [52, 55, 57, 61, 63, 67, 70, 74];
  const w = 100, h = 36;
  const x = (i: number) => 2 + (i * (w - 4)) / (pts.length - 1);
  const y = (v: number) => h - 3 - ((v - 48) / 30) * (h - 6);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" aria-hidden="true">
      <path d={`${d} L${x(7)},${h} L${x(0)},${h} Z`} fill="#f6c453" opacity="0.15" />
      <path d={d} fill="none" stroke="#f6c453" strokeWidth="2.5" strokeLinecap="round" className="tour-draw" />
      <circle cx={x(7)} cy={y(74)} r="3" fill="#f6c453" />
    </svg>
  );
}

function ProductDots() {
  return (
    <div className="flex h-9 items-center gap-1.5" aria-hidden="true">
      {["✓", "✓", "✓", "✕"].map((m, i) => (
        <span
          key={i}
          className={`tour-pop flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            m === "✕" ? "bg-terracotta/25 text-terracotta" : "bg-good/15 text-good"
          }`}
          style={{ animationDelay: `${0.3 + i * 0.2}s` }}
        >
          {m}
        </span>
      ))}
    </div>
  );
}

function HairBars() {
  return (
    <svg viewBox="0 0 100 36" className="h-9 w-full" aria-hidden="true">
      {[10, 15, 19, 24, 29, 34].map((v, i) => (
        <rect
          key={i}
          x={i * 17 + 2}
          y={36 - v}
          width="11"
          height={v}
          rx="3.5"
          fill="#f6c453"
          opacity={0.35 + i * 0.12}
          className="tour-grow"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </svg>
  );
}

const TILES: Array<{ title: string; sub: string; art: ReactNode; soon?: boolean }> = [
  { title: "Progress", sub: "Marks fading", art: <Sparkline /> },
  { title: "Products", sub: "Melanin-safe", art: <ProductDots /> },
  { title: "Hair care", sub: "Edges & length", art: <HairBars />, soon: true },
];

export function Tour({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <section className="mx-auto flex h-dvh max-w-md flex-col px-4 pb-5 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted">
          ← Back
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-honey">How Shine works</span>
      </div>

      <h2 className="rise mt-2 font-display text-[1.75rem] leading-[1.1] [@media(max-height:700px)]:text-2xl">
        See your skin the way <em className="text-sun">Shine sees it</em>
      </h2>

      <ScanShowcase className="rise rise-1 mt-3 min-h-[240px] flex-1" />

      <ul className="rise rise-2 mt-3 grid grid-cols-3 gap-2">
        {TILES.map((t) => (
          <li key={t.title} className="rounded-2xl bg-cocoa/80 p-2.5 ring-1 ring-mahogany">
            {t.art}
            <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-shea">
              {t.title}
              {t.soon && (
                <span className="rounded-full bg-espresso px-1 text-[8px] font-semibold uppercase tracking-wider text-muted ring-1 ring-mahogany">
                  Soon
                </span>
              )}
            </p>
            <p className="text-[10px] text-muted">{t.sub}</p>
          </li>
        ))}
      </ul>

      <button
        onClick={onStart}
        className="rise rise-3 mt-3 w-full rounded-full bg-gradient-to-r from-honey to-sun py-4 text-lg font-semibold text-espresso shadow-[0_10px_40px_-12px_rgba(246,196,83,0.7)] transition active:scale-[0.98]"
      >
        Start my scan
      </button>
    </section>
  );
}
