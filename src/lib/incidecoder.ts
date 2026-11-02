import "server-only";

/**
 * Look up a product's ingredient list on INCIDecoder (incidecoder.com, now served from
 * inkeedecoder.com). Server-side only; results cached in memory for the life of the process.
 */
const BASE = "https://incidecoder.com";
const UA = { "User-Agent": "Mozilla/5.0 (Seen skin journal; ingredient lookup)" };
const cache = new Map<string, { title: string; inci: string; url: string } | null>();

const decode = (s: string) =>
  s
    .replace(/[​‌‍﻿]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

async function get(path: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(BASE + path, { headers: UA, redirect: "follow", signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

export function extractIngredients(html: string): { title: string; inci: string } {
  const title = decode((html.match(/<title>([^<]*)/) ?? [])[1] ?? "").replace(/ ingredients \(Explained\)\s*$/i, "").trim();
  const start = html.indexOf('id="ingredlist-short"');
  if (start < 0) return { title, inci: "" };
  const ends = ['id="ingredlist-highlights-section"', 'id="ingredlist-long-section"', 'id="ingredlist-table-section"']
    .map((m) => html.indexOf(m, start))
    .filter((i) => i > start);
  const seg = html.slice(start, ends.length ? Math.min(...ends) : start + 20000);
  const names = [...seg.matchAll(/class="ingred-link[^"]*"[^>]*>([^<]+)</g)].map((m) => decode(m[1]).trim());
  return { title, inci: names.join(", ") };
}

/** Search by name and return the top match's ingredient list, or null. */
export async function lookupProduct(query: string): Promise<{ title: string; inci: string; url: string } | null> {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  try {
    const s = await get(`/search?query=${encodeURIComponent(query)}`);
    const slug = [...s.matchAll(/href="\/products\/([^"]+)"/g)].map((m) => m[1]).find((x) => x !== "create");
    if (!slug) {
      cache.set(key, null);
      return null;
    }
    const { title, inci } = extractIngredients(await get(`/products/${slug}`));
    const hit = inci ? { title, inci, url: `${BASE}/products/${slug}` } : null;
    cache.set(key, hit);
    return hit;
  } catch {
    return null; // network or site trouble: the user can paste the ingredients instead
  }
}
