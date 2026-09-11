import { expect, test } from "vitest";
import { schoolBreaks } from "./config";
import { datesOverlapWindow, isQualifyingFrontierDeal, parseFrontierDate, parseFrontierDealsHtml } from "./flights-frontier";

const spring = schoolBreaks[3];
const winter = schoolBreaks[2];

const fixture = `
Dallas, TX (DFW) To Las Vegas, NV (LAS) Departing Sep 15, 2026 From $60 One-way
Dallas, TX (DFW) To Orlando, FL (MCO) Departing Mar 14, 2027 From $42 One-way
Dallas, TX (DAL) To Denver, CO (DEN) Departing Mar 16, 2027 Returning Mar 20, 2027 From $88 Round trip
Houston, TX (IAH) To Orlando, FL (MCO) Departing Mar 15, 2027 From $38 One-way
Dallas, TX (DFW) To Atlanta, GA (ATL) Departing Mar 13, 2027 Returning Mar 21, 2027 From $70 Round trip
`;

test("parses month-day-year deal dates", () => {
  expect(parseFrontierDate("Sep 15, 2026")).toBe("2026-09-15");
  expect(parseFrontierDate("Mar 14, 2027")).toBe("2027-03-14");
});

test("keeps only complete advertised round trips that fit the trip policy", () => {
  const deals = parseFrontierDealsHtml(fixture, spring, "2026-09-11");

  expect(deals).toEqual([
    expect.objectContaining({ origin: "DAL", airportCode: "DEN", amount: 88, tripType: "round-trip", returnDate: "2027-03-20" }),
  ]);
});

test("does not invent a round-trip price from a one-way fare", () => {
  expect(parseFrontierDealsHtml("Dallas, TX (DFW) To Las Vegas, NV (LAS) Departing Mar 15, 2027 From $60 One-way", spring, "2026-09-11")).toEqual([]);
  expect(isQualifyingFrontierDeal({ tripType: "one-way", departureDate: "2027-03-15", returnDate: null }, spring)).toBe(false);
});

test("drops overlap-only and unknown-return fixtures", () => {
  expect(datesOverlapWindow(["2027-03-15"], spring)).toBe(true);
  expect(isQualifyingFrontierDeal({ tripType: "round-trip", departureDate: "2027-03-15", returnDate: null }, spring)).toBe(false);
  expect(isQualifyingFrontierDeal({ tripType: "round-trip", departureDate: "2026-12-19", returnDate: "2026-12-22" }, winter)).toBe(false);
  expect(parseFrontierDealsHtml("Dallas, TX (DFW) To Las Vegas, NV (LAS) Departing Sep 15, 2026 Returning Sep 18, 2026 From $60 Round trip", spring, "2026-09-11")).toEqual([]);
});

test("drops non-Dallas origins", () => {
  expect(parseFrontierDealsHtml("Houston, TX (IAH) To Orlando, FL (MCO) Departing Mar 15, 2027 Returning Mar 18, 2027 From $38 Round trip", spring, "2026-09-11")).toEqual([]);
});
