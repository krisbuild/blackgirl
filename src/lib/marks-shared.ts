/** Types and labels for mark counts, safe to import in the browser. */
export type Zone = "forehead" | "leftCheek" | "rightCheek" | "noseMouth" | "chinJaw";

export type MarkStats = {
  count: number;
  /** Share of the face's skin area covered by detections, in percent. */
  coveragePct: number;
  zones: Partial<Record<Zone, number>>;
  /** Spot centres and radii, normalised to 0..1 of the image, largest first. */
  spots: Array<{ x: number; y: number; r: number }>;
};

export const ZONE_LABEL: Record<Zone, string> = {
  forehead: "forehead",
  leftCheek: "left cheek",
  rightCheek: "right cheek",
  noseMouth: "nose & mouth area",
  chinJaw: "chin & jaw",
};

/** "mostly on your left cheek and right cheek" */
export function whereSummary(z: MarkStats["zones"]): string | null {
  const entries = (Object.entries(z) as Array<[Zone, number]>).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const top = entries.filter(([, n]) => n / total >= 0.25).slice(0, 2).map(([k]) => ZONE_LABEL[k]);
  return top.length ? `mostly on your ${top.join(" and ")}` : null;
}
