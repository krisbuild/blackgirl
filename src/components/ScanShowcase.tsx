"use client";

import { useEffect, useState } from "react";
import { PORTRAIT, SCAN, type ShowcaseConcern } from "@/data/showcase";

/**
 * "Live scan" viewer for the preview screen, over an AI-generated portrait.
 *
 * With SCAN data (from `npm run showcase`) it shows a real YouCam analysis of that portrait:
 * YouCam's own detection masks cycling over the photo, and the real raw scores.
 * Without it, the overlay shows where each concern is read, and no numbers.
 *
 * Every layer shares one 300x400 coordinate space (photo and SVG both "cover" a 3:4 frame).
 */

const W = 300;
const H = 400;
const FACE = PORTRAIT.face;

type Concern = ShowcaseConcern;

const CALLOUTS = PORTRAIT.callouts;

/** A soft face mesh: points on concentric ellipses, joined ring-to-ring. */
function buildMesh() {
  const rings = [0.25, 0.5, 0.75, 1];
  const per = 14;
  const pts = rings.map((r, ri) =>
    Array.from({ length: per }, (_, k) => {
      const a = (k / per) * Math.PI * 2 + (ri % 2 ? Math.PI / per : 0);
      return [FACE.cx + Math.cos(a) * FACE.rx * r, FACE.cy + Math.sin(a) * FACE.ry * r] as const;
    }),
  );
  const lines: string[] = [];
  pts.forEach((ring, ri) => {
    ring.forEach((p, k) => {
      const q = ring[(k + 1) % per];
      lines.push(`M${p[0].toFixed(1)},${p[1].toFixed(1)}L${q[0].toFixed(1)},${q[1].toFixed(1)}`);
      const next = pts[ri + 1];
      if (next) {
        const a = next[k], b = next[(k + (ri % 2 ? 1 : per - 1)) % per];
        lines.push(`M${p[0].toFixed(1)},${p[1].toFixed(1)}L${a[0].toFixed(1)},${a[1].toFixed(1)}`);
        lines.push(`M${p[0].toFixed(1)},${p[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`);
      }
    });
  });
  // vertical midline + eye line, like a landmark guide
  lines.push(`M${FACE.cx},${FACE.cy - FACE.ry}L${FACE.cx},${FACE.cy + FACE.ry}`);
  lines.push(`M${FACE.cx - FACE.rx},${FACE.cy - 18}L${FACE.cx + FACE.rx},${FACE.cy - 18}`);
  return { d: lines.join(""), nodes: pts.flat() };
}
const MESH = buildMesh();

export function ScanShowcase({ className = "" }: { className?: string }) {
  const real = SCAN;
  const maskKeys = (real ? (Object.keys(real.masks) as Concern[]) : []).filter((k) => real?.masks[k]);
  const [active, setActive] = useState(0);

  // Cycle through YouCam's masks (real mode) or callouts (illustration).
  useEffect(() => {
    const n = real ? Math.max(1, maskKeys.length) : CALLOUTS.length;
    const t = setInterval(() => setActive((v) => (v + 1) % n), 2600);
    return () => clearInterval(t);
  }, [real, maskKeys.length]);

  const activeKey: Concern = real ? (maskKeys[active] ?? "age_spot") : CALLOUTS[active].key;

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] bg-[#140a06] ring-1 ring-mahogany ${className}`}>
      {/* base: real photo or illustration */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={real?.image ?? PORTRAIT.image}
        alt={`${PORTRAIT.credit}${real ? ", scanned by YouCam AI Skin Analysis" : ""}`}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* YouCam's own detection masks */}
      {real &&
        maskKeys.map((k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={k}
            src={real.masks[k]}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${k === activeKey ? "opacity-90" : "opacity-0"}`}
          />
        ))}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={real ? "Real YouCam skin scan overlay" : "Skin scan overlay"}
      >
        <defs>
          <linearGradient id="sc-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6c453" stopOpacity="0" />
            <stop offset="0.85" stopColor="#f6c453" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fff3c9" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="sc-vignette" cx="50%" cy="48%" r="70%">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>
          <clipPath id="sc-face">
            <ellipse cx={FACE.cx} cy={FACE.cy} rx={FACE.rx + 4} ry={FACE.ry + 4} />
          </clipPath>
        </defs>

                <rect width={W} height={H} fill="url(#sc-vignette)" />

        {/* face mesh */}
        <g clipPath="url(#sc-face)">
          <path d={MESH.d} className="scan-mesh" fill="none" stroke="#f6c453" strokeWidth="0.5" opacity="0.4" />
          {MESH.nodes.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.9" fill="#fff3c9" opacity="0.6" />
          ))}
        </g>

        {/* face lock oval */}
        <ellipse
          cx={FACE.cx}
          cy={FACE.cy}
          rx={FACE.rx + 12}
          ry={FACE.ry + 12}
          fill="none"
          stroke="#8fcf9a"
          strokeWidth="1.5"
          strokeDasharray="5 6"
          className="scan-orbit"
        />

        {/* sweeping beam */}
        <g className="scan-beam">
          <rect x="0" y="-60" width={W} height="60" fill="url(#sc-beam)" />
          <rect x="0" y="-1.5" width={W} height="1.5" fill="#fff3c9" />
        </g>

        {/* corner brackets */}
        {[
          [18, 18, 1, 1],
          [W - 18, 18, -1, 1],
          [18, H - 18, 1, -1],
          [W - 18, H - 18, -1, -1],
        ].map(([x, y, sx, sy]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x},${y + 22 * sy}V${y}H${x + 22 * sx}`}
            fill="none"
            stroke="#fbf1e3"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />
        ))}

        {/* callouts: a dark pill keeps labels readable over bright photos */}
        {CALLOUTS.map((c) => {
          const on = c.key === activeKey;
          const score = real?.scores[c.key];
          const text = c.label.toUpperCase();
          const pillW = text.length * 7 + 16 + (score != null ? 26 : 0);
          const pillH = 20;
          const px = c.side === "l" ? 36 : W - 36 - pillW;
          const py = c.y - 36;
          const anchorX = c.side === "l" ? px + pillW : px;
          return (
            <g key={c.key} className="transition-opacity duration-500" opacity={on ? 1 : 0.55}>
              <circle cx={c.x} cy={c.y} r={on ? 11 : 8} fill="none" stroke="#f6c453" strokeWidth="2" className={on ? "scan-ping" : ""} />
              <circle cx={c.x} cy={c.y} r="3" fill="#f6c453" />
              <path d={`M${c.x},${c.y}L${anchorX},${py + pillH / 2}`} fill="none" stroke="#f6c453" strokeWidth="1.2" />
              <rect
                x={px}
                y={py}
                width={pillW}
                height={pillH}
                rx={pillH / 2}
                fill="#1d0f0a"
                fillOpacity="0.82"
                stroke={on ? "#f6c453" : "#4a2618"}
                strokeWidth="1"
              />
              <text x={px + 8} y={py + 14} fontSize="10.5" fontWeight="700" fill="#fbf1e3" style={{ letterSpacing: "0.06em" }}>
                {text}
              </text>
              {score != null && (
                <text x={px + pillW - 8} y={py + 14.5} textAnchor="end" fontSize="12" fontWeight="800" fill="#f6c453">
                  {Math.round(score)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em]">
        <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 text-shea backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun" />
          {real ? "Real scan" : "Scan preview"}
        </span>
        <span className="rounded-full bg-black/45 px-2 py-1 text-sand backdrop-blur">YouCam AI</span>
      </div>

      {/* bottom HUD */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
        <div className="flex gap-1.5">
          {["Light", "Angle", "Distance"].map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-good/20 px-2 py-0.5 text-[10px] font-semibold text-good">
              <span aria-hidden="true">✓</span>
              {t}
            </span>
          ))}
          {real?.skinType && (
            <span className="ml-auto rounded-full bg-honey/20 px-2 py-0.5 text-[10px] font-semibold text-honey">{real.skinType} skin</span>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
          <div className="scan-progress h-full rounded-full bg-gradient-to-r from-honey to-sun" />
        </div>
        <p className="mt-1.5 text-[9px] text-sand/70">
          {real ? `${PORTRAIT.credit} · real YouCam scan` : `${PORTRAIT.credit} · your scan will look like this`}
        </p>
      </div>
    </div>
  );
}
