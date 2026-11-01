import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Tiny file cache so a repeated photo never re-spends API units.
 * Local dev: ./.cache/youcam. Vercel (read-only FS): the OS temp dir, best effort.
 * Stores scores only, never the photo itself.
 */
const ROOT = process.env.VERCEL
  ? path.join(os.tmpdir(), "youcam-cache")
  : path.join(process.cwd(), ".cache", "youcam");

const file = (ns: string, key: string) => path.join(ROOT, ns, `${key.replace(/[^a-f0-9]/gi, "")}.json`);

export async function readCache<T>(ns: string, key: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file(ns, key), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeCache(ns: string, key: string, value: unknown): Promise<void> {
  try {
    await mkdir(path.join(ROOT, ns), { recursive: true });
    await writeFile(file(ns, key), JSON.stringify(value, null, 2));
  } catch (err) {
    console.warn("[youcam-cache] write failed:", (err as Error).message);
  }
}
