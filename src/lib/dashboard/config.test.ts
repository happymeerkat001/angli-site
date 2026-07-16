import { expect, test } from "vitest";
import { flightRoutes, googleFlightsUrl, newsSources } from "./config";

test("configures the requested flight routes and HTTPS news sources", () => {
  expect(flightRoutes.map((route) => route.destination)).toEqual([
    "CRK",
    "XIY",
    "XUZ",
    "TPE",
  ]);
  expect(newsSources.every(({ feedUrl }) => feedUrl.startsWith("https://"))).toBe(true);
});

test("creates a Google Flights link with the route and flexible June stay", () => {
  const url = googleFlightsUrl(flightRoutes[0]);

  expect(url).toContain("travel/flights");
  expect(url).toContain("DFW.CRK");
  expect(url).toContain("2026-06-15");
});
