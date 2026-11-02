// Run a REAL YouCam skin analysis on one portrait and save it as the preview-screen showcase.
//
//   npm run showcase            (defaults to public/showcase/portrait.jpg)
//
// Saves into public/showcase/: the resized photo YouCam scored (photo.jpg), plus YouCam's detection masks
// for dark marks (age_spot), acne, texture and redness (shown as sunburn). Writes them into SCAN in src/data/showcase.ts.
// Costs one skin-analysis task. Needs YOUCAM_API_KEY in .env.local.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const photoPath = process.argv[2] ?? "public/showcase/portrait.jpg";
const KEY = process.env.YOUCAM_API_KEY;
if (!KEY) throw new Error("YOUCAM_API_KEY is not set (add it to .env.local)");
const BASE = process.env.YOUCAM_BASE_URL ?? "https://yce-api-01.makeupar.com";
const ACTIONS = ["age_spot", "acne", "texture", "redness", "radiance", "pore", "oiliness", "moisture", "dark_circle_v2", "skin_type"];
const MASKS = ["age_spot", "acne", "texture", "redness", "dark_circle_v2"];

async function api(p, init = {}) {
  const res = await fetch(BASE + p, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${p} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}

const bytes = await readFile(photoPath);
const type = /\.png$/i.test(photoPath) ? "image/png" : "image/jpeg";

console.log("1/4 registering file");
const init = await api("/s2s/v2.0/file/skin-analysis", {
  method: "POST",
  body: JSON.stringify({ files: [{ content_type: type, file_name: path.basename(photoPath), file_size: bytes.length }] }),
});
const file = init.data.files[0];
const req = file.requests[0];
console.log("2/4 uploading photo");
const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => k.toLowerCase() !== "content-length").map(([k, v]) => [k, String(v)]));
const put = await fetch(req.url, { method: req.method || "PUT", headers, body: bytes });
if (!put.ok) throw new Error(`upload failed ${put.status}`);

console.log("3/4 running skin analysis");
const task = await api("/s2s/v2.0/task/skin-analysis", {
  method: "POST",
  body: JSON.stringify({ src_file_id: file.file_id, dst_actions: ACTIONS, miniserver_args: { enable_mask_overlay: false }, format: "json" }),
});
const taskId = task.data.task_id;
let result;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 2000)); // must poll within ~10 s or the task is dropped
  const s = await api(`/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`);
  const st = s.data.task_status ?? s.data.status;
  if (st === "success") { result = s.data.results; break; }
  if (st === "error") throw new Error(`analysis failed: ${s.data.error} ${s.data.error_message ?? ""}`);
}
if (!result) throw new Error("analysis timed out");

console.log("4/4 saving photo, masks and scores");
const outDir = path.join("public", "showcase");
await mkdir(outDir, { recursive: true });
const out = result.output ?? [];
const save = async (url, name) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${name} failed ${r.status}`);
  await writeFile(path.join(outDir, name), Buffer.from(await r.arrayBuffer()));
  return `/showcase/${name}`;
};

const resized = out.find((o) => o.type === "resize_image")?.mask_urls?.[0];
const image = resized ? await save(resized, "photo.jpg") : (await writeFile(path.join(outDir, "photo.jpg"), bytes), "/showcase/photo.jpg");
const masks = {};
const scores = {};
for (const o of out) {
  if (typeof o.raw_score === "number") scores[o.type] = Math.round(o.raw_score * 10) / 10;
  if (MASKS.includes(o.type) && o.mask_urls?.[0]) masks[o.type] = await save(o.mask_urls[0], `${o.type}.png`);
}
const skinType = out.find((o) => o.type === "skin_type" && (o.region ?? "whole") === "whole")?.skin_type;

const data = { image, masks, scores, skinType, analyzedAt: new Date().toISOString() };
const tsPath = path.join("src", "data", "showcase.ts");
const ts = await readFile(tsPath, "utf8");
await writeFile(
  tsPath,
  ts.replace(/export const SCAN: ShowcaseScan \| null = [\s\S]*;\s*$/, `export const SCAN: ShowcaseScan | null = ${JSON.stringify(data, null, 2)};\n`),
);
console.log("done:", JSON.stringify({ scores, skinType, masks: Object.keys(masks) }));
