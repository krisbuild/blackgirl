/**
 * Deployment health check: is the server configured, and can it reach YouCam?
 * Never returns secret values; only whether they're present and whether calls succeed.
 */
import { connection } from "next/server";

async function probe(url: string, init?: RequestInit) {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    const body = await r.text();
    let code: string | undefined;
    try {
      code = (JSON.parse(body) as { error_code?: string }).error_code;
    } catch {}
    return { ok: r.ok, http: r.status, errorCode: code, ms: Date.now() - t0 };
  } catch (e) {
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    return { ok: false, error: (e as Error).name, cause: cause?.code ?? cause?.message ?? (e as Error).message, ms: Date.now() - t0 };
  }
}

export async function GET() {
  await connection(); // always run at request time
  const raw = process.env.YOUCAM_API_KEY ?? "";
  const key = raw.trim().replace(/^["']|["']$/g, "");
  const keyInfo = {
    present: key.length > 0,
    length: key.length,
    startsWithSk: key.startsWith("sk-"),
    hadExtraWhitespaceOrQuotes: raw !== key,
    containsSpaces: /\s/.test(key),
    containsMaskDotsOrOddCharacters: /[^\x21-\x7e]/.test(key),
    looksLikeWholeLine: key.startsWith("YOUCAM_API_KEY"),
  };
  const youcam = key && !/\s/.test(key)
    ? await probe("https://yce-api-01.makeupar.com/s2s/v1.0/client/credit", { headers: { Authorization: `Bearer ${key}` } })
    : { ok: false, skipped: "no usable key" };
  return Response.json({
    youcamKey: keyInfo,
    youcamApi: youcam,
    supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    region: process.env.VERCEL_REGION ?? "local",
    checkedAt: new Date().toISOString(),
  });
}
