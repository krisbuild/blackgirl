/**
 * GET /api/reminders?start=YYYYMMDD&sunscreen=HH:MM&reapply=HH:MM&waterEvery=2&waterFrom=HH:MM&waterTo=HH:MM
 * Returns a calendar file of daily reminders. Served (not a blob) so iPhone Safari offers "Add All" to Calendar.
 */
import { connection } from "next/server";
import { buildReminderCalendar, DATE_RE, TIME_RE } from "@/lib/reminders";

export async function GET(req: Request) {
  await connection();
  const q = new URL(req.url).searchParams;
  const time = (k: string) => {
    const v = q.get(k);
    return v && TIME_RE.test(v) ? v : undefined;
  };
  const start = q.get("start") ?? "";
  if (!DATE_RE.test(start)) return Response.json({ error: "start must be YYYYMMDD" }, { status: 400 });
  const every = Number(q.get("waterEvery"));
  const body = buildReminderCalendar({
    start,
    sunscreen: time("sunscreen"),
    reapply: time("reapply"),
    waterEvery: [1, 2, 3, 4].includes(every) ? every : undefined,
    waterFrom: time("waterFrom"),
    waterTo: time("waterTo"),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="shine-reminders.ics"',
      "Cache-Control": "no-store",
    },
  });
}
