import { expect, test } from "vitest";
import { schoolBreaks } from "./config";
import {
  holidayInclusionLabel,
  isoToday,
  listValidTripPairs,
  nightsBetween,
  orderTripPairsForSearch,
  SEARCH_BATCH_SIZE,
  selectSearchBatch,
  tripDatePolicyFingerprint,
  tripFitsPolicy,
} from "./trip-dates";

const fall = schoolBreaks[0];
const thanksgiving = schoolBreaks[1];
const winter = schoolBreaks[2];
const spring = schoolBreaks[3];
const summer = schoolBreaks[4];

test("accepts exactly 3 and 7 nights and rejects 2 and 8", () => {
  expect(tripFitsPolicy({ departureDate: "2026-10-10", returnDate: "2026-10-13" }, fall)).toBe(true);
  expect(tripFitsPolicy({ departureDate: "2026-12-25", returnDate: "2027-01-01" }, winter)).toBe(true);
  expect(nightsBetween("2026-10-10", "2026-10-13")).toBe(3);
  expect(nightsBetween("2026-12-25", "2027-01-01")).toBe(7);
  expect(tripFitsPolicy({ departureDate: "2027-03-13", returnDate: "2027-03-15" }, spring)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2027-03-13", returnDate: "2027-03-21" }, spring)).toBe(false);
});

test("rejects malformed, reversed, past, and out-of-break dates", () => {
  expect(tripFitsPolicy({ departureDate: "2027-13-01", returnDate: "2027-03-16" }, spring)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "not-a-date", returnDate: "2027-03-16" }, spring)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2027-02-29", returnDate: "2027-03-04" }, spring)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2027-03-18", returnDate: "2027-03-13" }, spring)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2027-03-13", returnDate: "2027-03-16" }, spring, "2027-03-14")).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2027-03-12", returnDate: "2027-03-16" }, spring)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2027-03-16", returnDate: "2027-03-22" }, spring)).toBe(false);
});

test("accepts a holiday on either travel day and rejects winter trips covering neither", () => {
  expect(tripFitsPolicy({ departureDate: "2026-11-26", returnDate: "2026-11-29" }, thanksgiving)).toBe(true);
  expect(tripFitsPolicy({ departureDate: "2026-11-21", returnDate: "2026-11-26" }, thanksgiving)).toBe(true);
  expect(tripFitsPolicy({ departureDate: "2026-11-21", returnDate: "2026-11-24" }, thanksgiving)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2026-12-19", returnDate: "2026-12-22" }, winter)).toBe(false);
  expect(tripFitsPolicy({ departureDate: "2026-12-22", returnDate: "2026-12-25" }, winter)).toBe(true);
  expect(tripFitsPolicy({ departureDate: "2027-01-01", returnDate: "2027-01-04" }, winter)).toBe(true);
});

test("includes the seven-night two-holiday winter candidate", () => {
  const pairs = listValidTripPairs(winter, "2026-09-11");
  expect(pairs).toContainEqual({ departureDate: "2026-12-25", returnDate: "2027-01-01", nights: 7 });
  expect(holidayInclusionLabel(winter.holidays)).toBe("Includes Christmas and New Year's");
});

test("fall Oct 10-13 yields exactly one valid three-night pair", () => {
  expect(listValidTripPairs(fall, "2026-09-11")).toEqual([
    { departureDate: "2026-10-10", returnDate: "2026-10-13", nights: 3 },
  ]);
});

test("uses strict calendar arithmetic across years and leap days", () => {
  expect(nightsBetween("2026-12-31", "2027-01-03")).toBe(3);
  expect(nightsBetween("2028-02-26", "2028-02-29")).toBe(3);
  expect(nightsBetween("2028-02-29", "2028-03-03")).toBe(3);
  const leap = {
    label: "Leap",
    departureDate: "2028-02-26",
    returnDate: "2028-03-04",
    holidayCoverage: "none" as const,
    holidays: [],
  };
  expect(listValidTripPairs(leap, "2028-01-01")).toContainEqual({
    departureDate: "2028-02-26",
    returnDate: "2028-02-29",
    nights: 3,
  });
});

test("handles ongoing and expired windows without inventing whole-summer itineraries", () => {
  expect(listValidTripPairs(fall, "2026-10-11")).toEqual([]);
  expect(listValidTripPairs(winter, "2027-01-07")).toEqual([]);
  const remaining = listValidTripPairs(winter, "2026-12-26");
  expect(remaining.every((pair) => pair.departureDate >= "2026-12-26")).toBe(true);
  expect(remaining.some((pair) => pair.departureDate <= "2027-01-01" && pair.returnDate >= "2027-01-01")).toBe(true);
  expect(listValidTripPairs(summer, "2027-01-01").every((pair) => pair.nights >= 3 && pair.nights <= 7)).toBe(true);
  expect(listValidTripPairs(summer, "2027-01-01").some((pair) => pair.departureDate === "2027-06-18" && pair.returnDate === "2027-07-09")).toBe(false);
});

test("pins Dec 25-Jan 1 first in the winter search order and covers both single-holiday groups", () => {
  const ordered = orderTripPairsForSearch(listValidTripPairs(winter, "2026-09-11"), winter);
  expect(ordered[0]).toEqual({ departureDate: "2026-12-25", returnDate: "2027-01-01", nights: 7 });
  const firstBatch = selectSearchBatch(ordered, 0).batch;
  expect(firstBatch).toHaveLength(SEARCH_BATCH_SIZE);
  expect(firstBatch.some((pair) => pair.departureDate <= "2026-12-25" && pair.returnDate >= "2026-12-25" && pair.returnDate < "2027-01-01")).toBe(true);
  expect(firstBatch.some((pair) => pair.departureDate > "2026-12-25" && pair.departureDate <= "2027-01-01" && pair.returnDate >= "2027-01-01")).toBe(true);
  expect(new Set(firstBatch.map((pair) => pair.nights)).size).toBeGreaterThan(1);
});

test("distributes other-season first batches across durations and rotates until exhaustion", () => {
  const ordered = orderTripPairsForSearch(listValidTripPairs(spring, "2026-09-11"), spring);
  const first = selectSearchBatch(ordered, 0);
  expect(first.batch).toHaveLength(SEARCH_BATCH_SIZE);
  expect(first.batch.map((pair) => pair.nights).sort()).toEqual([3, 4, 5, 6, 7]);
  const second = selectSearchBatch(ordered, first.nextCursor);
  expect(second.batch.every((pair) => !first.batch.some((seen) => seen.departureDate === pair.departureDate && seen.returnDate === pair.returnDate))).toBe(true);
  let cursor = 0;
  const seen = new Set<string>();
  let wrapped = false;
  for (let step = 0; step < 20; step += 1) {
    const result = selectSearchBatch(ordered, cursor);
    for (const pair of result.batch) seen.add(`${pair.departureDate}/${pair.returnDate}`);
    if (result.nextCursor === 0 && cursor !== 0) {
      wrapped = true;
      break;
    }
    cursor = result.nextCursor;
  }
  expect(seen.size).toBe(ordered.length);
  expect(wrapped).toBe(true);
  expect(selectSearchBatch(ordered, ordered.length).batch).toEqual(selectSearchBatch(ordered, 0).batch);
});

test("builds a stable policy fingerprint from windows, holidays, and night bounds", () => {
  const fingerprint = tripDatePolicyFingerprint(schoolBreaks);
  expect(fingerprint).toContain("family-trip-windows-v1");
  expect(fingerprint).toContain("nights:3-7");
  expect(fingerprint).toContain("christmas=2026-12-25");
  expect(fingerprint).not.toEqual(tripDatePolicyFingerprint(schoolBreaks.map((schoolBreak, index) => (
    index === 4 ? { ...schoolBreak, returnDate: "2027-07-10" } : schoolBreak
  ))));
});

test("uses UTC today for remaining-window checks", () => {
  expect(isoToday(new Date("2026-12-25T05:00:00Z"))).toBe("2026-12-25");
});
