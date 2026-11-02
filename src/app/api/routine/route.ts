import INCI from "@/data/inci.json";
import type { SkinProfile } from "@/lib/ingredients";
import { lookupProduct } from "@/lib/incidecoder";
import { checkRoutine, type RoutineItem, type Slot } from "@/lib/routine";

type InItem = { name?: string; when?: Slot; ingredients?: string };
const VERIFIED = INCI as Record<string, { inci: string; title: string; url: string }>;

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9% ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

/** Best match in our verified catalogue, if the name clearly refers to one of its products. */
function fromCatalog(name: string) {
  const q = new Set(tokens(name));
  let best: { key: string; score: number } | null = null;
  for (const key of Object.keys(VERIFIED)) {
    const k = tokens(key);
    const hit = k.filter((t) => q.has(t)).length;
    const score = hit / k.length;
    if (hit >= 2 && score >= 0.6 && (!best || score > best.score)) best = { key, score };
  }
  return best ? { key: best.key, ...VERIFIED[best.key] } : null;
}

export async function POST(req: Request) {
  let body: { items?: InItem[]; profile?: SkinProfile & { pregnant?: boolean } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }
  const inItems = (body.items ?? []).filter((i) => i.name?.trim() || i.ingredients?.trim()).slice(0, 15);
  if (!inItems.length) return Response.json({ error: "Add at least one product." }, { status: 400 });

  const items: RoutineItem[] = [];
  const notFound: string[] = [];
  await Promise.all(
    inItems.map(async (it, idx) => {
      const name = (it.name ?? "").trim().slice(0, 120) || `Product ${idx + 1}`;
      const when: Slot = it.when === "AM" || it.when === "PM" ? it.when : "AM & PM";
      if (it.ingredients?.trim()) {
        items[idx] = { name, when, inci: it.ingredients.slice(0, 5000), source: "pasted" };
        return;
      }
      const cat = fromCatalog(name);
      if (cat) {
        items[idx] = { name, when, inci: cat.inci, matched: cat.title, source: "catalog" };
        return;
      }
      const live = await lookupProduct(name);
      if (live) items[idx] = { name, when, inci: live.inci, matched: live.title, source: "incidecoder" };
      else notFound.push(name);
    }),
  );
  const found = items.filter(Boolean);
  const result = checkRoutine(found, body.profile ?? { darkMarks: true, acne: true });
  return Response.json({ ...result, notFound });
}
