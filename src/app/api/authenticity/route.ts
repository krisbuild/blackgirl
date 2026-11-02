import { checkAuthenticity, gtinValid, type AuthInput, type DbLookup } from "@/lib/authenticity";

/** Look a barcode up in Open Beauty Facts (public, open data). Best effort with a short timeout. */
async function lookup(code: string): Promise<DbLookup> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${code}.json?fields=product_name,brands`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Shine/1.0 (skin journal; hackathon prototype)" },
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return { found: false, error: `HTTP ${res.status}` };
    const j = (await res.json()) as { status?: number; product?: { product_name?: string; brands?: string } };
    if (j.status !== 1 || !j.product) return { found: false };
    return { found: true, brand: j.product.brands?.split(",")[0]?.trim(), name: j.product.product_name };
  } catch (e) {
    return { found: false, error: (e as Error).name === "AbortError" ? "timeout" : "unreachable" };
  }
}

export async function POST(req: Request) {
  let body: AuthInput;
  try {
    body = (await req.json()) as AuthInput;
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }
  const code = (body.barcode ?? "").replace(/\D/g, "").slice(0, 14);
  const db = code && gtinValid(code) ? await lookup(code) : undefined;
  return Response.json({ ...checkAuthenticity({ ...body, barcode: code, lookup: db }), lookup: db });
}
