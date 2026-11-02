import "server-only";
import { PNG } from "pngjs";
import type { MarkStats, Zone } from "../marks-shared";

/**
 * Count and measure marks on YouCam's own detection masks.
 *
 * YouCam's whole-face scores average over the entire face, so a cluster of dark marks on one
 * cheek can still read "clear" (a real scan scored 93.8 with ~18 visible marks). The masks
 * show each detection, so we count connected blobs, measure how much of the face they cover,
 * and say where they sit. Everything here is derived from YouCam output; nothing is invented.
 */

type Mask = { width: number; height: number; alpha: Uint8Array };

export function decodeMask(png: Buffer | Uint8Array): Mask {
  const img = PNG.sync.read(Buffer.from(png));
  const alpha = new Uint8Array(img.width * img.height);
  const hist = new Uint32Array(256);
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = img.data[i * 4 + 3];
    hist[alpha[i]]++;
  }
  // HD masks can carry a uniform semi-transparent "dark background" layer over the whole image.
  // Treat the most common alpha as background and measure detections above it.
  let bg = 0;
  for (let v = 1; v < 256; v++) if (hist[v] > hist[bg]) bg = v;
  if (bg > 0) for (let i = 0; i < alpha.length; i++) alpha[i] = alpha[i] > bg ? alpha[i] - bg : 0;
  return { width: img.width, height: img.height, alpha };
}

/** Bounding box of pixels with alpha above zero, or null if empty. */
export function alphaBox(m: Mask) {
  let x0 = m.width, y0 = m.height, x1 = -1, y1 = -1;
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (m.alpha[y * m.width + x] > 0) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

const countAbove = (m: Mask, thr: number) => m.alpha.reduce((n, a) => n + (a >= thr ? 1 : 0), 0);

export function countMarks(
  mask: Mask,
  opts: {
    threshold?: number;
    /** Minimum blob area as a share of the image (filters specks). */
    minAreaFrac?: number;
    /** Face skin mask (e.g. YouCam's moisture map) used for coverage and zones. */
    face?: Mask | null;
    /** Eye line (y, in pixels) from the dark-circle map, to split forehead from cheeks. */
    eyeTopY?: number;
  } = {},
): MarkStats {
  const { width: W, height: H, alpha } = mask;
  const thr = opts.threshold ?? 32;
  const minArea = Math.max(4, Math.round((opts.minAreaFrac ?? 0.00003) * W * H));
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const blobs: Array<{ n: number; x: number; y: number }> = [];

  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] < thr || seen[i]) continue;
    seen[i] = 1;
    stack.push(i);
    let n = 0, sx = 0, sy = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % W, py = (p - px) / W;
      n++;
      sx += px;
      sy += py;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (!seen[q] && alpha[q] >= thr) {
            seen[q] = 1;
            stack.push(q);
          }
        }
    }
    if (n >= minArea) blobs.push({ n, x: sx / n, y: sy / n });
  }
  blobs.sort((a, b) => b.n - a.n);

  // Face geometry: from the face skin mask when available, else the image itself.
  const face = opts.face && opts.face.width === W && opts.face.height === H ? opts.face : null;
  const box = (face && alphaBox(face)) ?? { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
  const fw = box.x1 - box.x0 + 1, fh = box.y1 - box.y0 + 1;
  const cx = box.x0 + fw / 2;
  const eyeTop = opts.eyeTopY ?? box.y0 + fh * 0.36;

  const zoneOf = (x: number, y: number): Zone => {
    if (y < eyeTop) return "forehead";
    if (y > box.y0 + fh * 0.84) return "chinJaw";
    if (x < cx - fw * 0.14) return "leftCheek";
    if (x > cx + fw * 0.14) return "rightCheek";
    return "noseMouth";
  };
  const zones: Partial<Record<Zone, number>> = {};
  for (const b of blobs) {
    const z = zoneOf(b.x, b.y);
    zones[z] = (zones[z] ?? 0) + 1;
  }

  const marked = blobs.reduce((s, b) => s + b.n, 0);
  const faceArea = face ? countAbove(face, 1) : W * H;
  return {
    count: blobs.length,
    coveragePct: Math.round((marked / Math.max(1, faceArea)) * 1000) / 10,
    zones,
    spots: blobs.slice(0, 60).map((b) => ({
      x: Math.round((b.x / W) * 1000) / 1000,
      y: Math.round((b.y / H) * 1000) / 1000,
      r: Math.round((Math.sqrt(b.n / Math.PI) / W) * 1000) / 1000,
    })),
  };
}
