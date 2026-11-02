/**
 * Data for the scan showcase on the preview screen.
 *
 * PORTRAIT is an AI-generated photo (not a real person), labelled as such in the UI.
 * Face and callout positions are in the viewer's 300x400 space (the photo is 3:4).
 *
 * SCAN is filled in by `npm run showcase`, which runs a REAL YouCam skin analysis on the
 * portrait and saves YouCam's own masks and scores. Until then it is null and no scores show.
 */
export type ShowcaseConcern = "age_spot" | "acne" | "texture";

export type ShowcasePortrait = {
  image: string;
  credit: string;
  face: { cx: number; cy: number; rx: number; ry: number };
  callouts: Array<{ key: ShowcaseConcern; label: string; x: number; y: number; side: "l" | "r" }>;
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
  face: { cx: 152, cy: 186, rx: 76, ry: 88 },
  callouts: [
    { key: "age_spot", label: "Dark marks", x: 102, y: 186, side: "l" },
    { key: "texture", label: "Texture", x: 206, y: 192, side: "r" },
    { key: "acne", label: "Breakouts", x: 134, y: 98, side: "r" },
  ],
};

export const SCAN: ShowcaseScan | null = null;
