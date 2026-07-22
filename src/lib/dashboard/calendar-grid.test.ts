import { expect, test } from "vitest";
import { buildWeekStrip, eventDatesInChicago } from "./calendar-grid";

test("builds exactly seven Chicago-local days starting today", () => {
  const strip = buildWeekStrip(new Date("2026-07-15T01:00:00Z"), []);

  expect(strip).toHaveLength(7);
  expect(strip.map(({ date }) => date)).toEqual([
    "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20",
  ]);
  expect(strip[0].label).toBe("Tue, Jul 14");
});

test("buckets every event on its Chicago-local day", () => {
  const strip = buildWeekStrip(new Date("2026-07-14T12:00:00Z"), [
    { title: "Late", start: "2026-07-15T01:00:00Z", end: null, location: null, isAllDay: false },
    { title: "All day", start: "2026-07-15", end: "2026-07-16", location: null, isAllDay: true },
    { title: "Second", start: "2026-07-15T14:00:00Z", end: null, location: null, isAllDay: false },
  ]);

  expect(strip[0].events.map(({ title }) => title)).toEqual(["Late"]);
  expect(strip[1].events.map(({ title }) => title)).toEqual(["All day", "Second"]);
});

test("converts UTC event dates to the preceding Chicago calendar day when applicable", () => {
  expect(eventDatesInChicago({ title: "Late", start: "2026-07-15T01:00:00Z", end: null, location: null, isAllDay: false })).toEqual(["2026-07-14"]);
});
