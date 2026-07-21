import { expect, test } from "vitest";
import { fareSearch, flightRoutes, newsSources, schoolBreaks } from "./config";

test("configures the requested flight routes and HTTPS news sources", () => {
  expect(flightRoutes.map((route) => route.destination)).toEqual([
    "CRK",
    "XIY",
    "XUZ",
    "SJC",
  ]);
  expect(newsSources.every(({ feedUrl }) => feedUrl.startsWith("https://"))).toBe(true);
});

test("configures the MCA school-break fare windows", () => {
  expect(schoolBreaks).toEqual([
    { label: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13" },
    { label: "Thanksgiving Break", departureDate: "2026-11-21", returnDate: "2026-11-29" },
    { label: "Winter Break", departureDate: "2026-12-19", returnDate: "2027-01-06" },
    { label: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21" },
  ]);
});

test("uses the requested June–July 2027 round-trip dates", () => {
  expect(fareSearch).toMatchObject({
    departureDate: "2027-06-18",
    returnDate: "2027-07-09",
    adults: 1,
    cabin: "ECONOMY",
  });
});
