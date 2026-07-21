import { expect, test } from "vitest";
import { californiaAirports, fareSearch, flightRoutes, newsSources, schoolBreaks } from "./config";

test("configures the requested flight routes and HTTPS news sources", () => {
  expect(flightRoutes.map((route) => route.destination)).toEqual([
    "CRK",
    "XIY",
    "XUZ",
  ]);
  expect(newsSources.every(({ feedUrl }) => feedUrl.startsWith("https://"))).toBe(true);
});

test("configures the MCA school-break fare windows", () => {
  expect(schoolBreaks).toEqual([
    { label: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13" },
    { label: "Thanksgiving Break", departureDate: "2026-11-21", returnDate: "2026-11-29" },
    { label: "Winter Break", departureDate: "2026-12-19", returnDate: "2027-01-06" },
    { label: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21" },
    { label: "Summer Break", departureDate: "2027-06-18", returnDate: "2027-07-09" },
  ]);
});

test("configures California airport searches from DFW", () => {
  expect(californiaAirports).toEqual([
    { origin: "DFW", destination: "SJC", label: "San Jose, California" },
    { origin: "DFW", destination: "SFO", label: "San Francisco, California" },
    { origin: "DFW", destination: "SAN", label: "San Diego, California" },
  ]);
});

test("configures the fixed Summer 2027 fare search", () => {
  expect(fareSearch).toEqual({
    departureDate: "2027-06-18",
    returnDate: "2027-07-09",
    adults: 1,
    cabin: "ECONOMY",
  });
});
