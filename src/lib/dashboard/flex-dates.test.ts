import { expect, test } from "vitest";
import { buildFlexCandidates, nearestUpcomingWindow, nextSerpApiReset, windowsInBookingRange } from "./flex-dates";

test("builds the five bounded flexible candidates", () => {
  expect(buildFlexCandidates({ label: "Summer", departureDate: "2027-06-18", returnDate: "2027-07-09" })).toHaveLength(5);
});

test("drops invalid candidates for a short window", () => {
  expect(buildFlexCandidates({ label: "Fall", departureDate: "2026-10-10", returnDate: "2026-10-13" })).toHaveLength(1);
});

test("deduplicates identical date pairs", () => {
  expect(buildFlexCandidates({ label: "Any", departureDate: "2027-06-18", returnDate: "2027-07-09" }, 0)).toHaveLength(1);
});

test("keeps only upcoming departures within four calendar months", () => {
  expect(windowsInBookingRange(new Date("2026-07-22T12:00:00Z"), [
    { label: "Past", departureDate: "2026-07-21", returnDate: "2026-07-23" },
    { label: "Fall", departureDate: "2026-10-10", returnDate: "2026-10-13" },
    { label: "Boundary", departureDate: "2026-11-22", returnDate: "2026-11-25" },
    { label: "Thanksgiving", departureDate: "2026-11-21", returnDate: "2026-11-29" },
  ]).map(({ label }) => label)).toEqual(["Fall"]);
});

test("computes the next SerpApi reset on the configured day of the current month", () => {
  expect(nextSerpApiReset(new Date("2026-08-15T12:00:00Z"), 16)).toBe("2026-08-16");
  expect(nextSerpApiReset(new Date("2026-08-16T12:00:00Z"), 16)).toBe("2026-08-16");
});

test("computes the next SerpApi reset in the following month after the renewal day", () => {
  expect(nextSerpApiReset(new Date("2026-08-17T12:00:00Z"), 16)).toBe("2026-09-16");
  expect(nextSerpApiReset(new Date("2026-12-17T12:00:00Z"), 16)).toBe("2027-01-16");
});

test("selects the nearest future window by departure date", () => {
  const windows = [
    { label: "Past", departureDate: "2026-08-01", returnDate: "2026-08-03" },
    { label: "Fall", departureDate: "2026-10-10", returnDate: "2026-10-13" },
    { label: "Winter", departureDate: "2026-12-19", returnDate: "2027-01-06" },
  ];

  expect(nearestUpcomingWindow(new Date("2026-08-16T12:00:00Z"), windows)).toEqual(windows[1]);
});

test("selects the final window when every departure is past", () => {
  const windows = [
    { label: "Fall", departureDate: "2026-10-10", returnDate: "2026-10-13" },
    { label: "Winter", departureDate: "2026-12-19", returnDate: "2027-01-06" },
  ];

  expect(nearestUpcomingWindow(new Date("2027-02-01T12:00:00Z"), windows)).toEqual(windows[1]);
});
