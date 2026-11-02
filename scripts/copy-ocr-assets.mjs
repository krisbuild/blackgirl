// Copy Tesseract OCR files into public/ocr so the product label reader works without third-party CDNs.
// Runs automatically before `dev` and `build`.
import { copyFile, mkdir } from "node:fs/promises";
const out = "public/ocr";
await mkdir(`${out}/lang`, { recursive: true });
const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", `${out}/worker.min.js`],
  ...["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"].map((f) => [
    `node_modules/tesseract.js-core/${f}`,
    `${out}/${f}`,
  ]),
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", `${out}/lang/eng.traineddata.gz`],
];
for (const [from, to] of files) await copyFile(from, to);
console.log(`OCR assets copied to ${out}`);
