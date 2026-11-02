"use client";

import { useEffect, useState } from "react";
import { FACE_MESH } from "@/data/faceMesh";
import { PORTRAIT, SCAN, type ShowcaseConcern } from "@/data/showcase";

/**
 * "Live scan" viewer for the preview screen.
 *
 * The wireframe is the portrait's real face mesh (478 MediaPipe landmarks), so every line
 * follows her actual jaw, brows, eyes and lips. A scan band sweeps the face and lights the
 * mesh as it passes. With SCAN data (from `npm run showcase`), YouCam's own detection masks
 * and real raw scores are layered on top.
 *
 * Every layer shares one 300x400 space (photo and SVG both "cover" a 3:4 frame).
 */

const W = 300;
const H = 400;
const { bbox, anchors } = FACE_MESH;

const CALLOUTS: Array<{ key: ShowcaseConcern; label: string; at: [number, number]; side: "l" | "r"; dy: number }> = [
  { key: "age_spot", label: "Dark marks", at: anchors.cheekL, side: "l", dy: 34 },
  { key: "texture", label: "Texture", at: anchors.cheekR, side: "r", dy: 34 },
  { key: "acne", label: "Breakouts", at: anchors.forehead, side: "r", dy: -54 },
  // YouCam has no sunburn detector; its redness reading is the closest signal.
  { key: "redness", label: "Sunburn", at: anchors.nose, side: "l", dy: -44 },
];

const BEAM_FROM = bbox.top - 12;
const BEAM_TO = bbox.bottom + 14;

const BOX = { x: bbox.left - 14, y: bbox.top - 18, w: bbox.right - bbox.left + 28, h: bbox.bottom - bbox.top + 30 };

export function ScanShowcase({ className = "" }: { className?: string }) {
  const real = SCAN;
  const maskKeys = (real ? (Object.keys(real.masks) as ShowcaseConcern[]) : []).filter((k) => real?.masks[k]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const n = real ? Math.max(1, maskKeys.length) : CALLOUTS.length;
    const t = setInterval(() => setActive((v) => (v + 1) % n), 2800);
    return () => clearInterval(t);
  }, [real, maskKeys.length]);

  const activeKey: ShowcaseConcern = real ? (maskKeys[active] ?? "age_spot") : CALLOUTS[active].key;

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] bg-[#140a06] ring-1 ring-mahogany ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={real?.image ?? PORTRAIT.image}
        alt="Portrait being scanned for dark marks, texture and breakouts"
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

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="sc-vignette" cx="50%" cy="45%" r="75%">
            <stop offset="0.45" stopColor="#0b0503" stopOpacity="0" />
            <stop offset="1" stopColor="#0b0503" stopOpacity="0.7" />
          </radialGradient>
          <linearGradient id="sc-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.75" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="sc-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6c453" stopOpacity="0" />
            <stop offset="1" stopColor="#f6c453" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="sc-hfade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.22" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.78" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="sc-hmask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect x={BOX.x} y="0" width={BOX.w} height={H} fill="url(#sc-hfade)" />
          </mask>
          {/* the band that lights the mesh as the scan passes */}
          <mask id="sc-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <g>
              <rect x="0" y="-46" width={W} height="46" fill="url(#sc-band)" />
              <animateTransform attributeName="transform" type="translate" values={`0 ${BEAM_FROM};0 ${BEAM_TO};0 ${BEAM_FROM}`} dur="5.6s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
            </g>
          </mask>
        </defs>

        {/* slight cool-down of the photo so the overlay reads */}
        <rect width={W} height={H} fill="#0b0503" opacity="0.18" />
        <rect width={W} height={H} fill="url(#sc-vignette)" />

        {/* landmark points: only glow where the scan band passes */}
        <g mask="url(#sc-reveal)">
          <path d={FACE_MESH.dots} fill="none" stroke="#fff3c9" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
        </g>

        {/* feature contours */}
        <g fill="none" stroke="#f6c453" strokeLinecap="round" strokeLinejoin="round" className="scan-fade-in">
          <path d={FACE_MESH.contours.oval} strokeWidth="1.1" opacity="0.95" />
          <path d={FACE_MESH.contours.leftBrow + FACE_MESH.contours.rightBrow} strokeWidth="0.9" opacity="0.85" />
          <path d={FACE_MESH.contours.leftEye + FACE_MESH.contours.rightEye} strokeWidth="0.9" opacity="0.9" />
          <path d={FACE_MESH.contours.lips} strokeWidth="0.9" opacity="0.85" />
        </g>

        {/* scan beam line */}
        <g mask="url(#sc-hmask)">
          <rect x={BOX.x} y="-40" width={BOX.w} height="40" fill="url(#sc-beam)" />
          <rect x={BOX.x} y="-1" width={BOX.w} height="1.2" fill="#fff3c9" />
          <animateTransform attributeName="transform" type="translate" values={`0 ${BEAM_FROM};0 ${BEAM_TO};0 ${BEAM_FROM}`} dur="5.6s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
        </g>

        {/* face-lock box with corner ticks */}
        <g stroke="#fbf1e3" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.9">
          {[
            [BOX.x, BOX.y, 1, 1],
            [BOX.x + BOX.w, BOX.y, -1, 1],
            [BOX.x, BOX.y + BOX.h, 1, -1],
            [BOX.x + BOX.w, BOX.y + BOX.h, -1, -1],
          ].map(([x, y, sx, sy]) => (
            <path key={`${x}-${y}`} d={`M${x},${y + 14 * sy}V${y}H${x + 14 * sx}`} />
          ))}
        </g>
        <text x={BOX.x} y={BOX.y + BOX.h + 11} fontSize="7" fontWeight="700" fill="#fbf1e3" opacity="0.85" style={{ letterSpacing: "0.12em" }}>
          FACE LOCKED · 478 POINTS
        </text>

        {/* callouts anchored to real landmarks */}
        {CALLOUTS.map((c) => {
          const on = c.key === activeKey;
          const score = real?.scores[c.key];
          const text = c.label.toUpperCase();
          const pillW = text.length * 6.4 + 16 + (score != null ? 24 : 0);
          const pillH = 18;
          const px = c.side === "l" ? 30 : W - 30 - pillW;
          const py = c.at[1] + c.dy - pillH / 2;
          const elbowX = c.side === "l" ? px + pillW : px;
          return (
            <g key={c.key} className="transition-opacity duration-500" opacity={on ? 1 : 0.7}>
              <circle cx={c.at[0]} cy={c.at[1]} r="7" fill="none" stroke="#f6c453" strokeWidth="1.4" className={on ? "scan-ping" : ""} />
              <circle cx={c.at[0]} cy={c.at[1]} r="2.2" fill="#f6c453" />
              <path
                d={`M${c.at[0]},${c.at[1]}L${c.at[0]},${py + pillH / 2}H${elbowX}`}
                fill="none"
                stroke="#f6c453"
                strokeWidth="0.9"
              />
              <rect x={px} y={py} width={pillW} height={pillH} rx={pillH / 2} fill="#1d0f0a" fillOpacity="0.85" stroke={on ? "#f6c453" : "#4a2618"} strokeWidth="0.9" />
              <text x={px + 8} y={py + 12.4} fontSize="9.5" fontWeight="700" fill="#fbf1e3" style={{ letterSpacing: "0.06em" }}>
                {text}
              </text>
              {score != null && (
                <text x={px + pillW - 8} y={py + 12.8} textAnchor="end" fontSize="11" fontWeight="800" fill="#f6c453">
                  {Math.round(score)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em]">
        <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-shea backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun" />
          {real ? "Skin scan" : "Scanning"}
        </span>
        <span className="rounded-full bg-black/50 px-2.5 py-1 text-sand backdrop-blur">YouCam AI</span>
      </div>

      {/* bottom HUD */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-3.5 pt-10">
        <div className="flex items-center gap-1.5">
          {["Light", "Angle", "Distance"].map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-good/20 px-2 py-0.5 text-[10px] font-semibold text-good backdrop-blur">
              <span aria-hidden="true">✓</span>
              {t}
            </span>
          ))}
          {real?.skinType && (
            <span className="ml-auto rounded-full bg-honey/20 px-2 py-0.5 text-[10px] font-semibold text-honey">{real.skinType} skin</span>
          )}
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/15">
          <div className="scan-progress h-full rounded-full bg-gradient-to-r from-honey to-sun" />
        </div>
      </div>
    </div>
  );
}
