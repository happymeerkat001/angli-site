import { expect, test } from "vitest";
import { buildMonthGrids, eventDatesInChicago } from "./calendar-grid";

test("pads a mid-week month with leading days", () => {
  const [month] = buildMonthGrids(new Date("2026-07-15T12:00:00Z"), []);
  expect(month.weeks[0]).toHaveLength(7);
  expect(month.weeks[0][0].date).toBe("2026-06-28");
  expect(month.weeks[0][3].date).toBe("2026-07-01");
});

test("buckets a UTC event to its Chicago calendar date", () => {
  expect(eventDatesInChicago({ title: "Late", start: "2026-07-15T01:00:00Z", end: null, location: null, isAllDay: false })).toEqual(["2026-07-14"]);
});

test("includes both months when the thirty-day window crosses a boundary", () => {
  expect(buildMonthGrids(new Date("2026-07-15T12:00:00Z"), []).map(({ label }) => label)).toEqual(["July 2026", "August 2026"]);
});
