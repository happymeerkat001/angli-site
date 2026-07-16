import { expect, test } from "vitest";
import { fareSearch, flightRoutes, newsSources } from "./config";

test("configures the requested flight routes and HTTPS news sources", () => {
  expect(flightRoutes.map((route) => route.destination)).toEqual([
    "CRK",
    "XIY",
    "XUZ",
    "TPE",
  ]);
  expect(newsSources.every(({ feedUrl }) => feedUrl.startsWith("https://"))).toBe(true);
});

test("uses the requested June–July 2027 round-trip dates", () => {
  expect(fareSearch).toMatchObject({
    departureDate: "2027-06-18",
    returnDate: "2027-07-09",
    adults: 1,
    cabin: "ECONOMY",
  });
});
