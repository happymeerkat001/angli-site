import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { californiaAirports, fareSearch, flightRoutes, frontierSearchDestinations, newsSources, partnerHubAirports, schoolBreaks, serpApiRenewalDay } from "./config";

test("configures the requested flight routes and HTTPS news sources", () => {
  expect(flightRoutes.map((route) => route.destination)).toEqual([
    "CRK",
    "XIY",
    "XUZ",
  ]);
  expect(newsSources.every(({ feedUrl }) => feedUrl.startsWith("https://"))).toBe(true);
});

test("configures the MCA and Imagine overlap fare windows", () => {
  expect(schoolBreaks.map(({ label, departureDate, returnDate }) => ({ label, departureDate, returnDate }))).toEqual([
    { label: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-12" },
    { label: "Thanksgiving Break", departureDate: "2026-11-21", returnDate: "2026-11-29" },
    { label: "Winter Break", departureDate: "2026-12-19", returnDate: "2027-01-04" },
    { label: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21" },
    { label: "Summer Break", departureDate: "2027-05-22", returnDate: "2027-07-09" },
  ]);
  expect(schoolBreaks[1].holidays).toEqual([{ id: "thanksgiving", date: "2026-11-26", label: "Thanksgiving" }]);
  expect(schoolBreaks[2].holidays.map(({ id, date }) => ({ id, date }))).toEqual([
    { id: "christmas", date: "2026-12-25" },
    { id: "new-year", date: "2027-01-01" },
  ]);
});

test("configures California airport searches from DFW", () => {
  expect(californiaAirports).toEqual([
    { origin: "DFW", destination: "SJC", label: "San Jose, California" },
    { origin: "DFW", destination: "SFO", label: "San Francisco, California" },
    { origin: "DFW", destination: "SAN", label: "San Diego, California" },
  ]);
});

test("keeps the international summer search on its existing window and treats July 9 as provisional", async () => {
  expect(fareSearch).toEqual({
    departureDate: "2027-06-18",
    returnDate: "2027-07-09",
    adults: 1,
    cabin: "ECONOMY",
  });
  expect(schoolBreaks[4].returnDate).toBe("2027-07-09");
  expect(schoolBreaks[4].departureDate).toBe("2027-05-22");
  const source = await readFile(new URL("./config.ts", import.meta.url), "utf8");
  expect(source).toContain("not verify fall 2027");
  expect(source).toContain("provisional search end");
  expect(source).not.toContain("not published yet");
});

test("configures the monthly SerpApi renewal day", () => {
  expect(serpApiRenewalDay).toBe(16);
});

test("lists Chase and Amex partner hubs used for points ranking", () => {
  expect(partnerHubAirports).toEqual(expect.arrayContaining(["ORD", "DEN", "ATL", "CDG", "LHR", "YYZ"]));
});

test("includes Chicago ORD and MDW in the bounded Frontier destination rotation", () => {
  expect(frontierSearchDestinations.slice(0, 2)).toEqual([
    { destination: "ORD", label: "Chicago O'Hare" },
    { destination: "MDW", label: "Chicago Midway" },
  ]);
});
