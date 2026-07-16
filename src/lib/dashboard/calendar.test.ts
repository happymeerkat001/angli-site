import { expect, test } from "vitest";
import { normalizeCalendarEvents } from "./calendar";

test("keeps only display-safe upcoming calendar fields", () => {
  expect(normalizeCalendarEvents([
    { status: "cancelled", summary: "Cancelled", start: { dateTime: "2026-07-15T10:00:00-05:00" } },
    { summary: "Meeting", description: "Private", location: "Library", start: { dateTime: "2026-07-15T09:00:00-05:00" }, end: { dateTime: "2026-07-15T10:00:00-05:00" } },
    { summary: "All day", start: { date: "2026-07-16" }, end: { date: "2026-07-17" } },
  ])).toEqual([
    { title: "Meeting", start: "2026-07-15T09:00:00-05:00", end: "2026-07-15T10:00:00-05:00", location: "Library", isAllDay: false },
    { title: "All day", start: "2026-07-16", end: "2026-07-17", location: null, isAllDay: true },
  ]);
});
