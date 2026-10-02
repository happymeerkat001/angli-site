import { expect, test } from "vitest";
import { californiaAirports, cruiseGuestCount, cruiseLines, cruiseParty, cruisePartyLabel, cruiseSearch, cruiseWindows, fareSearch, flightRoutes, newsSources, schoolBreaks, serpApiRenewalDay } from "./config";

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

test("configures Galveston cruise search past the current school year", () => {
  expect(cruiseSearch).toEqual({
    portCode: "GAL",
    portName: "Galveston",
    flexDays: 2,
    pointsCentsPerPoint: 1.5,
    offersPerWindow: 4,
  });
  expect(cruiseParty).toEqual({ adults: 2, children: [] });
  expect(cruiseGuestCount()).toBe(2);
  expect(cruisePartyLabel()).toBe("2 adults");
  expect(cruiseGuestCount({ adults: 2, children: [{ age: 8 }, { age: 11 }] })).toBe(4);
  expect(cruisePartyLabel({ adults: 2, children: [{ age: 8 }, { age: 11 }] })).toBe("2 adults and 2 children (ages 8, 11)");
  expect(cruiseLines).toEqual([
    "Royal Caribbean",
    "Norwegian",
    "Princess",
  ]);
  expect(cruiseWindows.slice(0, schoolBreaks.length)).toEqual(schoolBreaks);
  expect(cruiseWindows.at(-1)).toEqual({ label: "Winter 2028-29", departureDate: "2028-12-01", returnDate: "2029-02-28" });
  expect(cruiseWindows.find((window) => window.label === "Winter 2027-28")?.departureDate).toBe("2027-12-01");
});

test("configures the monthly SerpApi renewal day", () => {
  expect(serpApiRenewalDay).toBe(16);
});
