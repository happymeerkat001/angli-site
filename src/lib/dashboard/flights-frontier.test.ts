import { expect, test } from "vitest";
import { datesOverlapWindow, parseFrontierDate, parseFrontierDealsHtml } from "./flights-frontier";

const spring = { label: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21" };

const fixture = `
Dallas, TX (DFW) To Las Vegas, NV (LAS) Departing Sep 15, 2026 From $60 One-way
Dallas, TX (DFW) To Orlando, FL (MCO) Departing Mar 14, 2027 From $42 One-way
Dallas, TX (DAL) To Denver, CO (DEN) Departing Mar 16, 2027 Returning Mar 20, 2027 From $88 Round trip
Houston, TX (IAH) To Orlando, FL (MCO) Departing Mar 15, 2027 From $38 One-way
`;

test("parses month-day-year deal dates", () => {
  expect(parseFrontierDate("Sep 15, 2026")).toBe("2026-09-15");
  expect(parseFrontierDate("Mar 14, 2027")).toBe("2027-03-14");
});

test("keeps Dallas one-way deals that overlap the selected break", () => {
  const deals = parseFrontierDealsHtml(fixture, spring);

  expect(deals).toEqual([
    expect.objectContaining({ origin: "DFW", airportCode: "MCO", amount: 42, tripType: "one-way", returnDate: null }),
    expect.objectContaining({ origin: "DAL", airportCode: "DEN", amount: 88, tripType: "round-trip", returnDate: "2027-03-20" }),
  ]);
});

test("does not invent a round-trip price from a one-way fare", () => {
  const [deal] = parseFrontierDealsHtml("Dallas, TX (DFW) To Las Vegas, NV (LAS) Departing Mar 15, 2027 From $60 One-way", spring);
  expect(deal.amount).toBe(60);
  expect(deal.tripType).toBe("one-way");
  expect(deal.airlineIdentity).toMatchObject({ kind: "single", segments: [expect.objectContaining({ iata: "F9", name: "Frontier" })] });
});

test("drops deals whose travel dates miss the selected break", () => {
  expect(datesOverlapWindow(["2026-09-15"], spring)).toBe(false);
  expect(parseFrontierDealsHtml("Dallas, TX (DFW) To Las Vegas, NV (LAS) Departing Sep 15, 2026 From $60 One-way", spring)).toEqual([]);
});

test("drops non-Dallas origins", () => {
  expect(parseFrontierDealsHtml("Houston, TX (IAH) To Orlando, FL (MCO) Departing Mar 15, 2027 From $38 One-way", spring)).toEqual([]);
});
