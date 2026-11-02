"use client";

import { useEffect, useState } from "react";
import { SHOWCASE } from "@/data/showcase";

/**
 * "Live scan" viewer for the preview screen.
 *
 * With SHOWCASE data (from `npm run showcase`), it shows a real YouCam analysis: the photo YouCam
 * scored, YouCam's own detection masks cycling over it, and the real raw scores.
 * Without it, an illustrated face stands in and no numbers are shown.
 *
 * Every layer shares one 300x400 coordinate space (photo and SVG both "cover" a 3:4 frame).
 */

const W = 300;
const H = 400;
const FACE = { cx: 150, cy: 200, rx: 82, ry: 112 };

type Concern = "age_spot" | "texture" | "acne";

const CALLOUTS: Array<{ key: Concern; label: string; x: number; y: number; side: "l" | "r" }> = [
  { key: "age_spot", label: "Dark marks", x: 112, y: 222, side: "l" },
  { key: "texture", label: "Texture", x: 190, y: 236, side: "r" },
  { key: "acne", label: "Breakouts", x: 168, y: 150, side: "r" },
];

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

function IllustratedFace() {
  return (
    <g>
      <defs>
        <linearGradient id="sc-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#80502f" />
          <stop offset="1" stopColor="#4a2a1c" />
        </linearGradient>
        <radialGradient id="sc-light" cx="38%" cy="30%" r="60%">
          <stop offset="0" stopColor="#f6c453" stopOpacity="0.25" />
          <stop offset="1" stopColor="#f6c453" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* afro */}
      <circle cx="150" cy="150" r="118" fill="#2c170f" />
      <circle cx="68" cy="128" r="50" fill="#331b11" />
      <circle cx="232" cy="128" r="50" fill="#331b11" />
      <circle cx="150" cy="58" r="56" fill="#331b11" />
      {/* neck + shoulders */}
      <path d="M118 300 L118 340 Q150 352 182 340 L182 300 Z" fill="#4a2a1c" />
      <path d="M40 400 Q60 338 150 336 Q240 338 260 400 Z" fill="#c4623a" opacity="0.85" />
      {/* face */}
      <ellipse cx={FACE.cx} cy={FACE.cy} rx={FACE.rx} ry={FACE.ry} fill="url(#sc-skin)" />
      <ellipse cx={FACE.cx} cy={FACE.cy} rx={FACE.rx} ry={FACE.ry} fill="url(#sc-light)" />
      {/* features */}
      <path d="M112 182 q14 -9 28 0" stroke="#24120b" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M160 182 q14 -9 28 0" stroke="#24120b" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M150 196 q-9 28 0 34 q9 -6 0 -34" fill="#3d2216" opacity="0.8" />
      <path d="M128 262 q22 14 44 0" stroke="#2a1309" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* a few soft dark marks */}
      {[
        [108, 226],
        [118, 236],
        [100, 240],
        [194, 244],
        [172, 150],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#2e170e" opacity="0.65" />
      ))}
    </g>
  );
}

export function ScanShowcase({ className = "" }: { className?: string }) {
  const real = SHOWCASE;
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
      {real ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={real.image} alt={`${real.credit}, scanned by YouCam AI Skin Analysis`} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}

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
        aria-label={real ? "Real YouCam skin scan" : "Illustration of a skin scan"}
      >
        <defs>
          <linearGradient id="sc-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6c453" stopOpacity="0" />
            <stop offset="0.85" stopColor="#f6c453" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fff3c9" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="sc-vignette" cx="50%" cy="48%" r="70%">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <clipPath id="sc-face">
            <ellipse cx={FACE.cx} cy={FACE.cy} rx={FACE.rx + 4} ry={FACE.ry + 4} />
          </clipPath>
        </defs>

        {!real && <IllustratedFace />}
        <rect width={W} height={H} fill="url(#sc-vignette)" />

        {/* face mesh */}
        <g clipPath="url(#sc-face)">
          <path d={MESH.d} className="scan-mesh" fill="none" stroke="#f6c453" strokeWidth="0.6" opacity="0.45" />
          {MESH.nodes.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.1" fill="#fff3c9" opacity="0.7" />
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

        {/* callouts */}
        {CALLOUTS.map((c) => {
          const on = c.key === activeKey;
          const tx = c.side === "l" ? 26 : W - 26;
          const score = real?.scores[c.key];
          return (
            <g key={c.key} className="transition-opacity duration-500" opacity={on ? 1 : 0.35}>
              <circle cx={c.x} cy={c.y} r={on ? 11 : 8} fill="none" stroke="#f6c453" strokeWidth="2" className={on ? "scan-ping" : ""} />
              <circle cx={c.x} cy={c.y} r="3" fill="#f6c453" />
              <path d={`M${c.x},${c.y}L${(c.x + tx) / 2},${c.y - 16}H${tx}`} fill="none" stroke="#f6c453" strokeWidth="1" />
              <text
                x={tx}
                y={c.y - 22}
                textAnchor={c.side === "l" ? "start" : "end"}
                fontSize="11"
                fontWeight="700"
                fill="#fbf1e3"
                style={{ letterSpacing: "0.04em" }}
              >
                {c.label.toUpperCase()}
              </text>
              {score != null && (
                <text x={tx} y={c.y - 6} textAnchor={c.side === "l" ? "start" : "end"} fontSize="16" fontWeight="700" fill="#f6c453">
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
          {real ? `${real.credit} · real YouCam scan` : "Illustration · your scan will look like this"}
        </p>
      </div>
    </div>
  );
}
