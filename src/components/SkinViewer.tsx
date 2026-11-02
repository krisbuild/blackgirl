"use client";

import { useState, type MouseEvent } from "react";
import type { Analysis } from "@/lib/journal";

const LAYERS = [
  { key: "age_spot", label: "Dark marks" },
  { key: "acne", label: "Acne" },
  { key: "texture", label: "Texture" },
] as const;

/**
 * Close-up view of the user's photo for dark marks and acne:
 * - YouCam's own detection maps (masks) over the photo, dark marks first
 * - "Enhance" boosts contrast so marks on deep skin are easier to see
 * - tap anywhere to zoom in on that spot, tap again to zoom out
 */
export function SkinViewer({
  photoUrl,
  analysis,
  size,
}: {
  photoUrl: string | null;
  analysis: Analysis;
  /** Pixel size of the analysed photo, so rings line up with object-cover. */
  size?: { width: number; height: number };
}) {
  const vw = size?.width ?? 750;
  const vh = size?.height ?? 1000;
  const masks = LAYERS.map((l) => ({ ...l, url: analysis.concerns.find((c) => c.concern === l.key)?.maskUrl })).filter(
    (l): l is (typeof LAYERS)[number] & { url: string } => !!l.url,
  );
  const [layer, setLayer] = useState<string | null>(masks[0]?.key ?? null);
  const [enhance, setEnhance] = useState(true);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const mask = masks.find((m) => m.key === layer)?.url;
  const counted = layer === "age_spot" ? analysis.marks?.darkMarks : layer === "acne" ? analysis.marks?.acne : undefined;
  const rings = counted?.spots.length ? { spots: counted.spots, color: layer === "acne" ? "#ff7aa8" : "#f6c453" } : null;

  const onTap = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom) return setZoom(null);
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const layerStyle = {
    transform: zoom ? "scale(2.6)" : "scale(1)",
    transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "50% 50%",
  };

  return (
    <div className="mt-5">
      <div
        onClick={onTap}
        role="button"
        aria-label={zoom ? "Zoom out" : "Tap to zoom in on an area"}
        className={`relative overflow-hidden rounded-[1.5rem] bg-cocoa ring-1 ring-mahogany ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        style={{ aspectRatio: "3 / 4" }}
      >
        <div className="absolute inset-0 transition-transform duration-500 ease-out" style={layerStyle}>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Your selfie"
              className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-300"
              style={{ filter: enhance ? "contrast(1.45) brightness(1.12) saturate(1.15)" : "none" }}
            />
          )}
          {mask && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mask} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-90" />
          )}
          {/* a ring on every mark counted from YouCam's map */}
          {rings && (
            <svg viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
              {rings.spots.map((p, n) => (
                <circle
                  key={n}
                  cx={p.x * vw}
                  cy={p.y * vh}
                  r={Math.max(0.012, p.r * 1.9) * vw}
                  fill="none"
                  stroke={rings.color}
                  strokeWidth={zoom ? 1.2 : 2}
                  vectorEffect="non-scaling-stroke"
                  className="mark-ring"
                  style={{ animationDelay: `${n * 40}ms` }}
                />
              ))}
            </svg>
          )}
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-shea backdrop-blur">
          {zoom ? "Zoomed · tap to reset" : "Tap to zoom"}
        </span>
        {counted && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-sun backdrop-blur">
            {counted.count} {layer === "acne" ? "acne spot" : "dark mark"}
            {counted.count === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setEnhance((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
            enhance ? "bg-sun text-espresso ring-sun" : "text-sand ring-mahogany"
          }`}
          aria-pressed={enhance}
        >
          ✦ Enhance
        </button>
        {masks.map((m) => (
          <button
            key={m.key}
            onClick={() => setLayer(layer === m.key ? null : m.key)}
            aria-pressed={layer === m.key}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
              layer === m.key ? "bg-shea text-espresso ring-shea" : "text-sand ring-mahogany"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {masks.length
          ? "Highlights are YouCam's own detection maps. Enhance raises contrast so marks on deep skin stand out; it doesn't change your scores."
          : "Enhance raises contrast so marks on deep skin stand out; it doesn't change your scores."}
      </p>
    </div>
  );
}
