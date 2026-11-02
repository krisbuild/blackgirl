// Fetch real ingredient lists for the product catalogue from INCIDecoder (inkeedecoder.com).
// Writes src/data/inci.json: { "<brand> <name>": { inci, url, title, fetchedAt } }.
// Run: node scripts/fetch-inci.mjs   (needs network access to incidecoder.com / inkeedecoder.com)
import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://inkeedecoder.com";
const UA = { "User-Agent": "Mozilla/5.0 (Shine skin journal; ingredient verification)" };
const decode = (s) => s.replace(/[\u200b\u200c\u200d\ufeff]/g, "").replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Pull catalogue entries straight from products.ts so the list stays in one place. */
const src = await readFile("src/lib/products.ts", "utf8");
const entries = [...src.matchAll(/\{ brand: "([^"]+)", name: "([^"]+)"/g)].map((m) => ({ brand: m[1], name: m[2] }));
const unique = [...new Map(entries.map((e) => [`${e.brand} ${e.name}`, e])).values()];

/** Optional overrides when search picks the wrong page: key -> product slug. */
const SLUG = JSON.parse(await readFile("scripts/inci-slugs.json", "utf8").catch(() => "{}"));

async function get(path) {
  const r = await fetch(BASE + path, { headers: UA, redirect: "follow" });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.text();
}

function extract(html) {
  const title = decode((html.match(/<title>([^<]*)/) ?? [])[1] ?? "").replace(/ ingredients \(Explained\)\s*$/i, "").trim();
  const start = html.indexOf('id="ingredlist-short"');
  if (start < 0) return { title, inci: "" };
  // the short list ends where the next section begins
  const ends = ['id="ingredlist-highlights-section"', 'id="ingredlist-long-section"', 'id="ingredlist-table-section"']
    .map((m) => html.indexOf(m, start))
    .filter((i) => i > start);
  const seg = html.slice(start, ends.length ? Math.min(...ends) : start + 20000);
  const names = [...seg.matchAll(/class="ingred-link[^"]*"[^>]*>([^<]+)</g)].map((m) => decode(m[1]).trim());
  return { title, inci: names.join(", ") };
}

const out = {};
for (const e of unique) {
  const key = `${e.brand} ${e.name}`;
  try {
    let slug = SLUG[key];
    if (!slug) {
      const s = await get(`/search?query=${encodeURIComponent(key)}`);
      slug = [...s.matchAll(/href="\/products\/([^"]+)"/g)].map((m) => m[1]).find((x) => x !== "create");
    }
    if (!slug) throw new Error("no search result");
    const { title, inci } = extract(await get(`/products/${slug}`));
    if (!inci) throw new Error("no ingredient list on page");
    out[key] = { inci, url: `https://incidecoder.com/products/${slug}`, title, fetchedAt: new Date().toISOString().slice(0, 10) };
    console.log(`✓ ${key}\n    -> ${title}  (${inci.split(", ").length} ingredients)`);
  } catch (err) {
    console.log(`✗ ${key}: ${err.message}`);
  }
}
await writeFile("src/data/inci.json", JSON.stringify(out, null, 2) + "\n");
console.log(`\nSaved ${Object.keys(out).length}/${unique.length} to src/data/inci.json`);
