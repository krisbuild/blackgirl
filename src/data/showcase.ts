/**
 * Data for the scan showcase on the preview screen.
 *
 * PORTRAIT is an AI-generated photo (not a real person). Its face mesh lives in faceMesh.ts.
 *
 * SCAN is filled in by `npm run showcase`, which runs a REAL YouCam skin analysis on the
 * portrait and saves YouCam's own masks and scores. Until then it is null and no scores show.
 */
export type ShowcaseConcern = "age_spot" | "acne" | "texture";

export type ShowcasePortrait = {
  image: string;
  credit: string;
};

export type ShowcaseScan = {
  /** Resized photo YouCam scored; masks line up with it exactly. */
  image: string;
  masks: Partial<Record<ShowcaseConcern, string>>;
  /** raw_score per concern, 1-100, higher = clearer. */
  scores: Record<string, number>;
  skinType?: string;
  analyzedAt: string;
};

export const PORTRAIT: ShowcasePortrait = {
  image: "/showcase/portrait.jpg",
  credit: "AI-generated portrait",
};

export const SCAN: ShowcaseScan | null = null;
