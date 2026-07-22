import { expect, test } from "vitest";
import { buildFlexCandidates, windowsInBookingRange } from "./flex-dates";

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
