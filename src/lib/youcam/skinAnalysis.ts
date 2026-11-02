import "server-only";
import { createHash } from "node:crypto";
import { readCache, writeCache } from "./cache";
import { runTask, uploadImage, YouCamError } from "./client";
import { alphaBox, countMarks, decodeMask } from "./marks";
import { imageSize } from "./imageSize";
import type { MarkStats } from "../marks-shared";

/**
 * SD concerns relevant to dark marks (post-inflammatory hyperpigmentation) and acne scarring.
 * SD needs a short side >= 480 px; HD needs >= 1080 px and cannot be mixed with SD.
 *
 * - age_spot  -> YouCam's "spots / pigmentation" detector; our closest proxy for dark marks
 * - acne      -> active breakouts
 * - texture   -> unevenness, which includes scarring
 * - redness, radiance, pore, oiliness, moisture -> context for evenness and routine advice
 * - dark_circle_v2 -> dark undereyes, very common on melanin-rich skin
 * - skin_type -> oily/dry/normal per zone, used to pick product textures
 */
export const SKIN_ACTIONS = [
  "age_spot",
  "acne",
  "texture",
  "redness",
  "radiance",
  "pore",
  "oiliness",
  "moisture",
  "dark_circle_v2",
  "skin_type",
] as const;
export type SkinConcern = (typeof SKIN_ACTIONS)[number];

/**
 * HD equivalents: finer detection of small acne and marks, needs a short side >= 1080 px.
 * Costs 20 credits for 9-12 concerns vs 14 for SD. HD and SD can't be mixed in one task.
 */
export const HD_ACTIONS = [
  "hd_age_spot",
  "hd_acne",
  "hd_texture",
  "hd_redness",
  "hd_radiance",
  "hd_pore",
  "hd_oiliness",
  "hd_moisture",
  "hd_dark_circle",
  "hd_skin_type",
] as const;
export const HD_MIN_SHORT_SIDE = 1080;

/** HD concern names that differ from our SD names after stripping "hd_". */
const HD_RENAME: Record<string, string> = { dark_circle: "dark_circle_v2" };

export interface ConcernScore {
  concern: string;
  /** 1-100, higher = clearer/healthier. The docs say this is the honest number. */
  rawScore: number;
  /** 1-100, deliberately flattering per the docs. Shown only as secondary. */
  uiScore: number;
  maskUrl?: string;
  /** Detections counted on YouCam's mask (dark marks and acne only). */
  count?: number;
  coveragePct?: number;
}

export interface SkinAnalysisResult {
  source: "live" | "cache";
  analyzedAt: string;
  concerns: ConcernScore[];
  overall?: number;
  skinAge?: number;
  /** e.g. { whole: "Oily", t_zone: "Oily", u_zone: "Normal" } when skin_type was requested */
  skinType?: Record<string, string>;
  /** "hd" when the photo was sharp enough for YouCam's finer HD analysis. */
  quality?: "hd" | "sd";
  /** Counted from YouCam's own masks: how many, how much of the face, and where. */
  marks?: { darkMarks?: MarkStats; acne?: MarkStats };
}

type RawOutput = {
  type?: string;
  ui_score?: number;
  raw_score?: number;
  mask_urls?: string[];
  score?: number;
  region?: string;
  skin_type?: string;
};

/** Normalise the format=json result. Tolerant of the shape variations in the docs. */
export function parseSkinResults(results: unknown): Omit<SkinAnalysisResult, "source" | "analyzedAt"> {
  const out: ConcernScore[] = [];
  let overall: number | undefined;
  let skinAge: number | undefined;
  let skinType: Record<string, string> | undefined;

  const r = results as { output?: RawOutput[]; all?: { score?: number }; skin_age?: number } | undefined;
  for (const item of r?.output ?? []) {
    if (!item?.type) continue;
    if (item.type === "all") {
      overall = item.score ?? item.raw_score;
      continue;
    }
    if (item.type === "skin_age") {
      skinAge = item.score;
      continue;
    }
    const type = item.type.replace(/^hd_/, "");
    if (type === "skin_type") {
      if (item.skin_type) (skinType ??= {})[item.region ?? "whole"] = item.skin_type;
      continue;
    }
    if (typeof item.raw_score !== "number" && typeof item.ui_score !== "number") continue;
    // HD pores/wrinkles also report sub-regions; keep the whole-face reading only.
    if (item.region && item.region !== "whole" && item.region !== "all") continue;
    const name = HD_RENAME[type] && item.type.startsWith("hd_") ? HD_RENAME[type] : type;
    if (out.some((o) => o.concern === name)) continue;
    out.push({
      concern: name,
      rawScore: Math.round((item.raw_score ?? item.ui_score ?? 0) * 10) / 10,
      uiScore: Math.round(item.ui_score ?? item.raw_score ?? 0),
      maskUrl: item.mask_urls?.[0],
    });
  }
  overall ??= r?.all?.score;
  skinAge ??= r?.skin_age;
  if (out.length === 0) {
    throw new YouCamError("Skin analysis returned no scores", "bad_response");
  }
  return { concerns: out, overall, skinAge, skinType };
}

export async function analyzeSkin(
  image: Uint8Array,
  contentType: "image/jpeg" | "image/png",
): Promise<SkinAnalysisResult> {
  const size = imageSize(image);
  const hd = !!size && Math.min(size.width, size.height) >= HD_MIN_SHORT_SIDE;
  const actions: readonly string[] = hd ? HD_ACTIONS : SKIN_ACTIONS;
  // HD masks default to a grey "dark background" layer over the whole photo; switch it off so the
  // masks show detections only (cleaner overlay, and countable).
  const miniserverArgs: Record<string, unknown> = { enable_mask_overlay: false };
  if (hd) {
    for (const c of ["age_spot", "acne", "texture", "pore", "oiliness", "redness", "wrinkle", "firmness"]) {
      miniserverArgs[`enable_dark_background_hd_${c}`] = false;
    }
  }

  // Same photo + same actions = same answer: never spend units twice.
  const key = createHash("sha256")
    .update(image)
    .update(actions.join(","))
    .update(JSON.stringify(miniserverArgs))
    .digest("hex");
  const cached = await readCache<{ parsed: SkinAnalysisResult }>("skin", key);
  // Mask URLs expire after ~2 h; scores stay valid, so the cache is still useful.
  if (cached) {
    const hit: SkinAnalysisResult = { ...cached.parsed, source: "cache" };
    // Older cache entries predate mark counting; count now (free) while mask URLs are valid.
    if (!hit.marks) {
      hit.marks = await measureMarks(hit);
      for (const c of hit.concerns) {
        const m = c.concern === "age_spot" ? hit.marks?.darkMarks : c.concern === "acne" ? hit.marks?.acne : undefined;
        if (m) Object.assign(c, { count: m.count, coveragePct: m.coveragePct });
      }
    }
    return hit;
  }

  const fileId = await uploadImage("skin-analysis", image, contentType);
  const results = await runTask("skin-analysis", {
    src_file_id: fileId,
    dst_actions: actions,
    miniserver_args: miniserverArgs,
    format: "json",
  });
  const parsed: SkinAnalysisResult = {
    ...parseSkinResults(results),
    source: "live",
    analyzedAt: new Date().toISOString(),
    quality: hd ? "hd" : "sd",
  };
  parsed.marks = await measureMarks(parsed);
  for (const c of parsed.concerns) {
    const m = c.concern === "age_spot" ? parsed.marks?.darkMarks : c.concern === "acne" ? parsed.marks?.acne : undefined;
    if (m) {
      c.count = m.count;
      c.coveragePct = m.coveragePct;
    }
  }
  await writeCache("skin", key, { parsed, raw: results });
  return parsed;
}

async function fetchMask(url?: string) {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    return res.ok ? decodeMask(new Uint8Array(await res.arrayBuffer())) : null;
  } catch {
    return null;
  }
}

/**
 * Count dark marks and acne on YouCam's masks. Best effort: if a mask can't be fetched or
 * decoded, the scan still succeeds without counts.
 */
export async function measureMarks(r: Pick<SkinAnalysisResult, "concerns">): Promise<SkinAnalysisResult["marks"]> {
  const url = (k: string) => r.concerns.find((c) => c.concern === k)?.maskUrl;
  const [spots, acne, face, eyes] = await Promise.all(
    ["age_spot", "acne", "moisture", "dark_circle_v2"].map((k) => fetchMask(url(k))),
  );
  if (!spots && !acne) return undefined;
  const eyeBox = eyes ? alphaBox(eyes) : null;
  const opts = { face, eyeTopY: eyeBox?.y0 };
  try {
    return {
      darkMarks: spots ? countMarks(spots, { ...opts, threshold: 32 }) : undefined,
      acne: acne ? countMarks(acne, { ...opts, threshold: 1, minAreaFrac: 0.00001 }) : undefined,
    };
  } catch (e) {
    console.warn("[marks] counting failed:", (e as Error).message);
    return undefined;
  }
}
