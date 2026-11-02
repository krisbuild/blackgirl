import "server-only";
import { createHash } from "node:crypto";
import { readCache, writeCache } from "./cache";
import { runTask, uploadImage, YouCamError } from "./client";

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

export interface ConcernScore {
  concern: string;
  /** 1-100, higher = clearer/healthier. The docs say this is the honest number. */
  rawScore: number;
  /** 1-100, deliberately flattering per the docs. Shown only as secondary. */
  uiScore: number;
  maskUrl?: string;
}

export interface SkinAnalysisResult {
  source: "live" | "cache";
  analyzedAt: string;
  concerns: ConcernScore[];
  overall?: number;
  skinAge?: number;
  /** e.g. { whole: "Oily", t_zone: "Oily", u_zone: "Normal" } when skin_type was requested */
  skinType?: Record<string, string>;
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
    if (item.type === "skin_type") {
      if (item.skin_type) (skinType ??= {})[item.region ?? "whole"] = item.skin_type;
      continue;
    }
    if (typeof item.raw_score !== "number" && typeof item.ui_score !== "number") continue;
    out.push({
      concern: item.type.replace(/^hd_/, ""),
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
  // Same photo + same actions = same answer: never spend units twice.
  const key = createHash("sha256")
    .update(image)
    .update(SKIN_ACTIONS.join(","))
    .digest("hex");
  const cached = await readCache<{ parsed: SkinAnalysisResult }>("skin", key);
  // Mask URLs expire after ~2 h; scores stay valid, so the cache is still useful.
  if (cached) return { ...cached.parsed, source: "cache" };

  const fileId = await uploadImage("skin-analysis", image, contentType);
  const results = await runTask("skin-analysis", {
    src_file_id: fileId,
    dst_actions: SKIN_ACTIONS,
    miniserver_args: { enable_mask_overlay: false },
    format: "json",
  });
  const parsed: SkinAnalysisResult = {
    ...parseSkinResults(results),
    source: "live",
    analyzedAt: new Date().toISOString(),
  };
  await writeCache("skin", key, { parsed, raw: results });
  return parsed;
}
