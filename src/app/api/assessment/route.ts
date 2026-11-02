import { assess, type AssessmentInput } from "@/lib/assessment";

/** Server-side assessment: YouCam measurements + the user's answers -> evidence-graded plan. */
export async function POST(req: Request) {
  let body: AssessmentInput;
  try {
    body = (await req.json()) as AssessmentInput;
  } catch {
    return Response.json({ error: "Send the scan as JSON." }, { status: 400 });
  }
  if (!Array.isArray(body?.concerns) || body.concerns.length === 0 || body.concerns.length > 40) {
    return Response.json({ error: "Missing scan measurements." }, { status: 400 });
  }
  const concerns = body.concerns
    .filter((c) => typeof c?.concern === "string" && Number.isFinite(c.rawScore))
    .map((c) => ({
      concern: c.concern.slice(0, 40),
      rawScore: Math.max(0, Math.min(100, Number(c.rawScore))),
      count: Number.isFinite(c.count) ? Math.max(0, Math.min(10000, Number(c.count))) : undefined,
      coveragePct: Number.isFinite(c.coveragePct) ? Number(c.coveragePct) : undefined,
    }));
  return Response.json(assess({ ...body, concerns }));
}
