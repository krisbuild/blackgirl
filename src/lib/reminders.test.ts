import { describe, expect, it } from "vitest";
import { buildReminderCalendar, waterTimes } from "./reminders";

describe("reminders calendar", () => {
  it("lists water times every N hours", () => {
    expect(waterTimes("09:00", "19:00", 2)).toEqual(["0900", "1100", "1300", "1500", "1700", "1900"]);
    expect(waterTimes("09:30", "12:00", 3)).toEqual(["0930"]);
  });
  it("builds daily events with alarms", () => {
    const ics = buildReminderCalendar(
      { start: "20261103", sunscreen: "07:30", reapply: "12:30", waterEvery: 3, waterFrom: "09:00", waterTo: "18:00" },
      new Date("2026-11-02T12:00:00Z"),
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2 + 4);
    expect(ics).toContain("DTSTART:20261103T073000");
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(6);
    expect(ics).toContain("SUMMARY:☀ Apply sunscreen");
    expect(ics).toContain("SUMMARY:💧 Drink a glass of water");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const l of ics.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n /g, "")).toContain("biggest factor in fading dark marks.");
  });
  it("skips anything not chosen", () => {
    const ics = buildReminderCalendar({ start: "20261103", sunscreen: "07:30" });
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});
